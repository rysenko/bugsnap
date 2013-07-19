define(['lib/jquery', 'lib/knockout', 'comm/communicator', 'comm/fieldInfo'], function ($, ko, Communicator, FieldInfo) {
    var GeminiCommunicator = (function (_super) {
        var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;
        GeminiCommunicator.prototype = Object.create(_super.prototype);
        function GeminiCommunicator(settings) {
            _super.call(this, settings);
            this.geminiUsername = function () {
                return window.btoa(this.Login() + ':' + this.Key());
            };
            this.UserId = null;
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
        GeminiCommunicator.prototype.comment = function (issueId, comment, fields) {
            var data = {
                IssueId: issueId,
                UserId: this.UserId,
                Comment: comment
            };
            return this.ajax(this.Url() + "api/items/" + issueId + "/comments", data).then(function (data) {
                fields.project.Value(data.BaseEntity.ProjectId);
                return data;
            });
        };
        GeminiCommunicator.prototype.attach = function (issueId, fileContent, fields) {
            var data = {
                ProjectId: fields.project.Value(),
                IssueId: issueId,
                Name: "screenshot.png",
                ContentType: "image/png",
                Content: fileContent
            };
            return this.ajax(this.Url() + "api/items/" + issueId + "/attachments", data);
        };
        GeminiCommunicator.prototype.create = function (title, description, fields) {
            var data = {
                Title: title,
                Description: description,
                ProjectId: fields.project.Value(),
                Components: fields.component.Value() ? fields.component.Value() : '',
                TypeId: fields.type.Value(),
                PriorityId: fields.priority.Value(),
                SeverityId: fields.severity.Value(),
                StatusId: fields.status.Value()
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
        GeminiCommunicator.prototype.getRedirectUrl = function (issueId, fields) {
            _super.prototype.getRedirectUrl.call(this, issueId, fields);
            return this.Url() + 'project/' + fields.project.Option().Code + '/' + fields.project.Value() + '/item/' + issueId;
        };
        GeminiCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        GeminiCommunicator.prototype.loadUser = function () {
            return this.ajax(this.Url() + 'api/users/username/' + this.Login(), null, 'GET').then(function (data) {
                this.UserId = data.BaseEntity.Id;
            });
        };
        GeminiCommunicator.prototype.getFields = function () {
            var fields = {
                project: new FieldInfo({Caption: 'Project'}),
                component: new FieldInfo({Caption: 'Component'}),
                type: new FieldInfo({Caption: 'Type'}),
                priority: new FieldInfo({Caption: 'Priority'}),
                severity: new FieldInfo({Caption: 'Severity'}),
                status: new FieldInfo({Caption: 'Status'})
            };
            this.loadUser();
            this.loadProjects().done(function (data) {
                fields.project.Options(data);
            });
            var templateId = ko.computed(function () {
                var projectOption = fields.project.Option();
                return projectOption ? projectOption.TemplateId : undefined;
            });
            fields.project.Value.subscribe(function (projectId) {
                if (projectId) {
                    this.loadComponents(projectId).done(function (data) {
                        fields.component.Options(data);
                    });
                }
            }, this);
            templateId.subscribe(function (templateId) {
                if (templateId) {
                    this.loadMetaData('type', templateId).done(function (data) {
                        fields.type.Options(data);
                    });
                    this.loadMetaData('priority', templateId).done(function (data) {
                        fields.priority.Options(data);
                    });
                    this.loadMetaData('severity', templateId).done(function (data) {
                        fields.severity.Options(data);
                    });
                    this.loadMetaData('status', templateId).done(function (data) {
                        fields.status.Options(data);
                    });
                }
            }, this);
            return fields;
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
    return GeminiCommunicator;
});
