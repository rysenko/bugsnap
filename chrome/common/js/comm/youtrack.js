define(['lib/jquery', 'comm/Communicator', 'comm/FieldInfo'], function ($, Communicator, FieldInfo) {
    var YouTrackCommunicator = (function (_super) {
        YouTrackCommunicator.prototype = Object.create(_super.prototype);
        function YouTrackCommunicator(settings) {
            _super.call(this, settings);
            this.Url = function () {
                var url = this.Settings().Url;
                if (url.lastIndexOf('/') != url.length - 1) {
                    url += '/';
                }
                return url;
            };
        }
        YouTrackCommunicator.prototype.authenticate = function () {
            return this.ajax(this.Url() + 'rest/user/login', {login: this.Login(), password: this.Password()});
        };
        YouTrackCommunicator.prototype.test = function () {
            return this.authenticate();
        };
        YouTrackCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.Url() + 'rest/project/all', {}, 'GET').then(function (data) {
                return $.map(data, function (item) {
                    return {Id: item.shortName, Name: item.name};
                });
            });
        };
        YouTrackCommunicator.prototype.search = function (query) {
            return this.ajax(this.Url() + 'rest/issue?filter=' + query, {}, 'GET').then(function (data) {
                var getSummary = function (fields) {
                    for (var i = 0; i < fields.length; i++) {
                        var field = fields[i];
                        if (field.name == 'summary') return field.value;
                    }
                    return '';
                };
                return $.map(data.issue, function (item) {
                    return {Id: item.id, Name: getSummary(item.field)};
                });
            });
        };
        YouTrackCommunicator.prototype.getFields = function () {
            var project = new FieldInfo({Id: 'project', Caption: 'Project'});
            var self = this;
            this.authenticate().then(function () {
                self.loadProjects().done(function (data) {
                    project.Options(data);
                });
            });
            return [project];
        };
        YouTrackCommunicator.prototype.create = function (title, description, fields) {
            var fieldsHash = this.getHash(fields);
            var data = {
                project: fieldsHash.project.Id,
                summary: title,
                description: description
            };
            return this.ajax(this.Url() + "rest/issue", data, 'PUT').then(function (location) {
                var slashPos = location.lastIndexOf('/');
                var id = location.substring(slashPos + 1);
                return {Id: id};
            });
        };
        YouTrackCommunicator.prototype.attach = function (issueId, fileContent) {
            var binary = atob(fileContent);
            var arr = [];
            for(var i = 0; i < binary.length; i++) {
                arr.push(binary.charCodeAt(i));
            }
            var fileBlob = new Blob([new Uint8Array(arr)], {type: 'image/png'});
            var data = new FormData();
            data.append('screenshot', fileBlob, 'screenshot.png');
            return this.ajax(this.Url() + "rest/issue/" + issueId + "/attachment", data);
        };
        YouTrackCommunicator.prototype.comment = function (issueId, comment) {
            var data = {
                command: 'comment',
                comment: comment
            };
            return this.ajax(this.Url() + "rest/issue/" + issueId + "/execute", data);
        };
        YouTrackCommunicator.prototype.getUrl = function (issueId, fields) {
            return this.Url() + 'issue/' + issueId;
        };
        YouTrackCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true);
            xhr.setRequestHeader('Accept', 'application/json');
            if (!(data instanceof FormData)) {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        try {
                            deferred.resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            deferred.resolve(xhr.responseText);
                        }
                    } else if (xhr.status == 201) {
                        deferred.resolve(xhr.getResponseHeader('Location'));
                    } else {
                        if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                            deferred.reject('Unable to connect to YouTrack at specified URL.');
                        } else {
                            deferred.reject('Unable to login using supplied credentials.');
                        }
                    }
                }
            };
            if (data instanceof FormData) {
                xhr.send(data);
            } else {
                xhr.send($.param(data));
            }
            return deferred.promise();
        };
        return YouTrackCommunicator;
    })(Communicator);
    return YouTrackCommunicator;
});
