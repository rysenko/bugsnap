define(['lib/jquery', 'comm/communicator', 'comm/fieldInfo'], function ($, Communicator, FieldInfo) {
    var JiraCommunicator = (function (_super) {
        JiraCommunicator.prototype = Object.create(_super.prototype);
        function JiraCommunicator(settings) {
            _super.call(this, settings);
            this.Url = function () {
                var url = this.Settings().Url;
                if (url.lastIndexOf('/') != url.length - 1) {
                    url += '/';
                }
                return url;
            };
        }
        JiraCommunicator.prototype.authenticate = function () {
            return this.ajax(this.Url() + 'rest/user/login', {login: this.Login(), password: this.Password()});
        };
        JiraCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        JiraCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.Url() + 'rest/api/2/project', {}, 'GET').then(function (data) {
                return $.map(data, function (item) {
                    return {Id: item.key, Name: item.name};
                });
            });
        };
        JiraCommunicator.prototype.search = function (query) {
            var jql = 'text ~ "' + query + '"';
            return this.ajax(this.Url() + 'rest/api/2/search?jql=' + encodeURIComponent(jql), {}, 'GET').then(function (data) {
                return $.map(data.issues, function (item) {
                    return {Id: item.key, Name: item.fields.summary};
                });
            });
        };
        JiraCommunicator.prototype.getFields = function () {
            var fields = {
                project: new FieldInfo({Caption: 'Project'})
            };
            var self = this;
            this.loadProjects().done(function (data) {
                fields.project.Options(data);
            });
            return fields;
        };
        JiraCommunicator.prototype.create = function (title, description, fields) {
            var data = {
                project: fields.project.Value(),
                summary: title,
                description: description
            };
            return this.ajax(this.Url() + "rest/issue", data, 'PUT').then(function (location) {
                var slashPos = location.lastIndexOf('/');
                var id = location.substring(slashPos + 1);
                return {Id: id};
            });
        };
        JiraCommunicator.prototype.attach = function (issueId, fileContent) {
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
        JiraCommunicator.prototype.comment = function (issueId, comment) {
            var data = {
                command: 'comment',
                comment: comment
            };
            return this.ajax(this.Url() + "rest/issue/" + issueId + "/execute", data);
        };
        JiraCommunicator.prototype.getRedirectUrl = function (issueId, fields) {
            _super.prototype.getRedirectUrl.call(this, issueId, fields);
            return this.Url() + 'issue/' + issueId;
        };
        JiraCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true);
            xhr.setRequestHeader('Accept', 'application/json');
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
        return JiraCommunicator;
    })(Communicator);
    return JiraCommunicator;
});
