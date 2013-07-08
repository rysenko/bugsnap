define(['js/jquery', 'js/knockout'], function ($, ko) {
    var FieldInfo = (function () {
        function FieldInfo(options) {
            this.Id = options.Id;
            this.Caption = ko.observable(options.Caption);
            this.Options = ko.observableArray();
            this.Value = ko.observable();
        }

        return FieldInfo;
    })();

    var Communicator = (function () {
        function Communicator(settings) {
            this.Settings = function () {
                var stored = localStorage['CommunicatorSettings'] ? JSON.parse(localStorage['CommunicatorSettings']) : {};
                return settings || stored;
            };
            this.Url = function () {
                var url = this.Settings().Url;
                if (url.lastIndexOf('/') != url.length - 1) {
                    url += '/';
                }
                return url;
            };
            this.Login = function () {
                return this.Settings().Login;
            };
            this.Password = function () {
                return this.Settings().Password;
            };
            this.Key = function () {
                return this.Settings().Key;
            };
            this.getHash = function (fields) {
                var result = {};
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    result[field.Id] = field.Value();
                }
                return result;
            };
        }
        return Communicator;
    })();

    var GeminiCommunicator = (function (_super) {
        var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;
        GeminiCommunicator.prototype = Object.create(_super.prototype);
        function GeminiCommunicator(settings) {
            _super.call(this, settings);
            this.geminiUsername = function () {
                return window.btoa(this.Login() + ':' + this.Key());
            };
        }
        GeminiCommunicator.prototype.search = function (query) {
            var data = {
                 SearchKeywords: query,
                 IncludeClosed: "false",
                 Projects: "ALL",
                 MaxItemsToReturn: 10
            };
            return this.ajax(this.Url() + "api/items/filtered", data).then(function (data) {
                return $.map(data, function (item) {
                    item.Name = item.IssueKey + " " + (item.Title || item.ComponentName);
                    item.Id = item.Id || item.IssueID;
                    return item;
                });
            });
        };
        GeminiCommunicator.prototype.comment = function (issueId, comment) {
            var data = {
                IssueId: issueId,
                UserId: "1",
                Comment: comment
            };
            return this.ajax(this.Url() + "api/items/" + issueId + "/comments", data);
        };
        GeminiCommunicator.prototype.attach = function (issueId, fileContent, fields) {
            var fieldsHash = this.getHash(fields);
            var data = {
                    ProjectId: fieldsHash.project.Id,
                    IssueId: issueId,
                    Name: "screenshot.png",
                    ContentType: "image/png",
                    Content: fileContent
                };
            return this.ajax(this.Url() + "api/items/" + issueId + "/attachments", data);
        };
        GeminiCommunicator.prototype.create = function (title, description, fields) {
            var fieldsHash = this.getHash(fields);
            var data = {
                    Title: title,
                    Description: description,
                    ProjectId: fieldsHash.project.Id,
                    Components: fieldsHash.component ? fieldsHash.component.Id : '',
                    TypeId: fieldsHash.type.Id,
                    PriorityId: fieldsHash.priority.Id,
                    SeverityId: fieldsHash.severity.Id,
                    StatusId: fieldsHash.status.Id
                };
            return this.ajax(this.Url() + "api/items/", data);
        };
        GeminiCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.Url() + "api/projects/", null, 'GET').then(function (data) {
                return $.map(data, function (item) {
                    return item.BaseEntity;
                });
            });
        };
        GeminiCommunicator.prototype.loadComponents = function (projectId) {
            return this.ajax(this.Url() + "api/projects/" + projectId+ "/components", null, 'GET').then(function (data) {
                var result = ko.utils.arrayMap(data, function (item) {
                    return item.BaseEntity;
                });
                if(result.length == 0) {
                    result.push({});
                }
                return result;
            });
        };
        GeminiCommunicator.prototype.loadMetaData = function (control, templateId) {
            return this.ajax(this.Url() + 'api/' + control + "/template/" + templateId, null, 'GET').then(function (data) {
                return ko.utils.arrayMap(data, function (item) {
                    return {Id: item.Entity.Id, Name: item.Entity.Label};
                });
            });
        };
        GeminiCommunicator.prototype.getUrl = function (issueId, fields) {
            var fieldsHash = this.getHash(fields);
            return this.Url() + 'project/' + fieldsHash.project.Code + '/' + fieldsHash.project.Id + '/item/' + issueId;
        };
        GeminiCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        GeminiCommunicator.prototype.getFields = function () {
            var project = new FieldInfo({Id: 'project', Caption: 'Project'});
            var component = new FieldInfo({Id: 'component', Caption: 'Component'});
            var type = new FieldInfo({Id: 'type', Caption: 'Type'});
            var priority = new FieldInfo({Id: 'priority', Caption: 'Priority'});
            var severity = new FieldInfo({Id: 'severity', Caption: 'Severity'});
            var status = new FieldInfo({Id: 'status', Caption: 'Status'});
            this.loadProjects().done(function (data) {
                project.Options(data);
            });
            var templateId = ko.computed(function () {
                var projectVal = project.Value();
                return projectVal ? projectVal.TemplateId : null;
            });
            project.Value.subscribe(function (projectVal) {
                this.loadComponents(projectVal.Id).done(function (data) {
                    component.Options(data);
                });
            }, this);
            templateId.subscribe(function (templateId) {
                this.loadMetaData('type', templateId).done(function (data) {
                    type.Options(data);
                });
                this.loadMetaData('priority', templateId).done(function (data) {
                    priority.Options(data);
                });
                this.loadMetaData('severity', templateId).done(function (data) {
                    severity.Options(data);
                });
                this.loadMetaData('status', templateId).done(function (data) {
                    status.Options(data);
                });
            }, this);
            return [project, component, type, priority, severity, status];
        };
        GeminiCommunicator.prototype.ajax = function(url, data, method) {            
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true);
            xhr.setRequestHeader('Accept', "*/*", false);
            if(!isFF){
                xhr.setRequestHeader('Authorization', 'Basic ' + this.geminiUsername());
                xhr.setRequestHeader('Content-Type', 'application/json');
            } else {
                document.cookie = "authorizationCookie=" + this.geminiUsername() + "; path=/";
            }
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        if(xhr.responseText === "null") {
                            deferred.reject('Unable to login using supplied credentials.');
                        } else {
                            deferred.resolve(JSON.parse(xhr.responseText));
                        }
                    } else {
                        if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                            deferred.reject('Unable to connect to Gemini at specified URL.');
                        } else {
                            deferred.reject('Unable to login using supplied credentials.');
                        }
                    }
                }
            };
            xhr.send(JSON.stringify(data));
            return deferred.promise();
        };
        return GeminiCommunicator;
    })(Communicator);

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

    var CommunicatorLoader = function (communicatorType) {
        var type = communicatorType || localStorage['CommunicatorType'];
        var result = GeminiCommunicator; // Default one
        switch (type) {
            case 'YouTrack':
                result = YouTrackCommunicator;
                break;
        }
        return result;
    };
    return CommunicatorLoader;
});