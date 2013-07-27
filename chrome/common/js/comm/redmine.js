define(['lib/jquery', 'comm/communicator', 'comm/fieldInfo'], function ($, Communicator, FieldInfo) {
    var RedmineCommunicator = (function (_super) {
        RedmineCommunicator.prototype = Object.create(_super.prototype);
        function RedmineCommunicator(settings) {
            _super.call(this, settings);
            this.AuthToken = function () {
                return window.btoa(this.Login() + ':' + this.Password());
            };
        }
        RedmineCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        RedmineCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.Url() + 'projects.json', {}, 'GET').then(function (data) {
                return $.map(data.projects, function (item) {
                    return {Id: item.id, Name: item.name};
                });
            });
        };
        RedmineCommunicator.prototype.search = function (query) {
            return this.ajax(this.Url() + 'issues.json?subject=~' + query, {}, 'GET').then(function (data) {
                return $.map(data.issues, function (item) {
                    return {Id: item.id, Name: item.subject};
                });
            });
        };
        RedmineCommunicator.prototype.getFields = function () {
            var fields = {
                project: new FieldInfo({Caption: 'Project'})
            };
            this.loadProjects().done(function (data) {
                fields.project.Options(data);
            });
            return fields;
        };
        RedmineCommunicator.prototype.create = function (title, description, fields) {
            var data = {issue: {
                project_id: fields.project.Value(),
                subject: title,
                description: description
            }};
            return this.ajax(this.Url() + 'issues.json', data).then(function (data) {
                return {Id: data.issue.id};
            });
        };
        RedmineCommunicator.prototype.attach = function (issueId, fileContent) {
            var binary = atob(fileContent);
            var arr = [];
            for(var i = 0; i < binary.length; i++) {
                arr.push(binary.charCodeAt(i));
            }
            var fileBlob = new Blob([new Uint8Array(arr)], {type: 'image/png'});
            var self = this;
            return this.ajax(this.Url() + 'uploads.json', fileBlob).then(function (data) {
                var uploadsData = {issue: {
                    uploads: [
                        {
                            token: data.upload.token,
                            filename: 'screenshot.png',
                            content_type: 'image/png'
                        }
                    ]
                }};
                return self.ajax(self.Url() + 'issues/' + issueId + '.json', uploadsData, 'PUT');
            });
        };
        RedmineCommunicator.prototype.comment = function (issueId, comment) {
            var data = { issue: {
                notes: comment
            }};
            return this.ajax(this.Url() + 'issues/' + issueId + '.json', data, 'PUT');
        };
        RedmineCommunicator.prototype.getRedirectUrl = function (issueId, fields) {
            _super.prototype.getRedirectUrl.call(this, issueId, fields);
            return this.Url() + 'issues/' + issueId;
        };
        RedmineCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true, this.Login(), this.Password());
            if (data instanceof Blob) {
                xhr.setRequestHeader('Content-Type', 'application/octet-stream');

            } else {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200 || xhr.status == 201) {
                        try {
                            deferred.resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            deferred.resolve(xhr.responseText);
                        }
                    } else {
                        if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                            deferred.reject('Unable to connect to Jira at specified URL.');
                        } else {
                            deferred.reject('Unable to login using supplied credentials.');
                        }
                    }
                }
            };
            if (data instanceof Blob) {
                xhr.send(data);
            } else {
                xhr.send(JSON.stringify(data));
            }
            return deferred.promise();
        };
        return RedmineCommunicator;
    })(Communicator);
    return RedmineCommunicator;
});
