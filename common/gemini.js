define(['js/jquery'], function ($) {
    var Communicator = (function () {
        function Communicator(settings) {
            this.Settings = function () {
                var stored = localStorage['CommunicatorSettings'] ? JSON.parse(localStorage['CommunicatorSettings']) : {};
                return settings || stored;
            };
            this.Url = function () {
                return this.Settings().Url;
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
        }
        return Communicator;
    })();

    var GeminiCommunicator = (function (_super) {
        var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;
        GeminiCommunicator.prototype = Object.create(_super.prototype);
        function GeminiCommunicator(settings) {
            _super.call(this, settings);
            this.geminiUrl = function () {
                return this.Url() + '/api/';
            };
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
            return this.ajax(this.geminiUrl() + "items/filtered", data);
        };
        GeminiCommunicator.prototype.comment = function (projectId, issueId, comment) {
            var data = {
                ProjectId: projectId,
                IssueId: issueId,
                UserId: "1",
                Comment: comment
            };
            return this.ajax(this.geminiUrl() + "items/" + issueId + "/comments", data);
        };
        GeminiCommunicator.prototype.attach = function (projectId, issueId, fileContent) {
            var data = {
                    ProjectId: projectId,
                    IssueId: issueId,
                    Name: "screenshot.png",
                    ContentType: "image/png",
                    Content: fileContent
                };
            return this.ajax(this.geminiUrl() + "items/" + issueId + "/attachments", data);
        };
        GeminiCommunicator.prototype.create = function (title, description, project, component, type, priority, severity, status) {
            var data = {
                    Title: title,
                    Description: description,
                    ProjectId: project,
                    Components: component,
                    TypeId: type,
                    PriorityId: priority,
                    SeverityId: severity,
                    StatusId: status,
                    ReportedBy: "1"
                };
            return this.ajax(this.geminiUrl() + "items/", data);
        };
        GeminiCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.geminiUrl() + "projects/", null, 'GET');
        };
        GeminiCommunicator.prototype.loadComponents = function (projectId) {
            return this.ajax(this.geminiUrl() + "projects/" + projectId+ "/components", null, 'GET');
        };
        GeminiCommunicator.prototype.loadMetaData = function (control, templateId) {
            return this.ajax(this.geminiUrl() + control + "/template/" + templateId, null, 'GET');
        };
        GeminiCommunicator.prototype.test = function () {
            return this.loadProjects();
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
        }
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
    }
    return CommunicatorLoader;
});