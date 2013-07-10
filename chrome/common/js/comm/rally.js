define(['lib/jquery', 'comm/Communicator', 'comm/FieldInfo'], function ($, Communicator, FieldInfo) {
    var RallyCommunicator = (function (_super) {
        RallyCommunicator.prototype = Object.create(_super.prototype);
        function RallyCommunicator(settings) {
            _super.call(this, settings);
            this.Url = function () {
                return 'https://rally1.rallydev.com/slm/webservice/v2.0/';
            };
        }
        RallyCommunicator.prototype.getIdFromUrl = function (url) {
            var slashPos = url.lastIndexOf('/');
            return url.substring(slashPos + 1);
        };
        RallyCommunicator.prototype.authenticate = function () {
            return this.ajax(this.Url() + 'rest/user/login', {login: this.Login(), password: this.Password()});
        };
        RallyCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        RallyCommunicator.prototype.loadProjects = function () {
            var self = this;
            return this.ajax(this.Url() + 'project', {}, 'GET').then(function (data) {
                return $.map(data.QueryResult.Results, function (item) {
                    return {Id: self.getIdFromUrl(item._ref), Name: item._refObjectName};
                });
            });
        };
        RallyCommunicator.prototype.search = function (query) {
            return this.ajax(this.Url() + 'defect?filter=' + query, {}, 'GET').then(function (data) {
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
        RallyCommunicator.prototype.getFields = function () {
            var project = new FieldInfo({Id: 'project', Caption: 'Project'});
            var self = this;
            this.authenticate().then(function () {
                self.loadProjects().done(function (data) {
                    project.Options(data);
                });
            });
            return [project];
        };
        RallyCommunicator.prototype.create = function (title, description, fields) {
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
        RallyCommunicator.prototype.attach = function (issueId, fileContent) {
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
        RallyCommunicator.prototype.comment = function (issueId, comment) {
            var data = {
                command: 'comment',
                comment: comment
            };
            return this.ajax(this.Url() + "rest/issue/" + issueId + "/execute", data);
        };
        RallyCommunicator.prototype.getUrl = function (issueId, fields) {
            return this.Url() + 'issue/' + issueId;
        };
        RallyCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true, this.Login(), this.Password());
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
                    } else {
                        if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                            deferred.reject('Unable to connect to Rally at standard URL.');
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
        return RallyCommunicator;
    })(Communicator);
    return RallyCommunicator;
});
