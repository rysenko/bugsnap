define(['js/jquery'], function ($) {
    var Gemini4Communicator = (function () {
        function Gemini4Communicator() {
            this.geminiUrl = function () {
                return localStorage['GeminiUrl'] + '/api/';
            }
            this.geminiUsername = function () {
                return window.btoa(localStorage["UserName"]);
            };
            this.geminiApiKey = function () {
                return window.btoa(localStorage["APIKey"]);
            };
        }
        Gemini4Communicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            url = url + '?format=json&gemini-username-token=' + this.geminiUsername() + '&gemini-api-token=' + this.geminiApiKey();
            xhr.open((method || 'POST'), url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    deferred.resolve(JSON.parse(xhr.responseText));
                }
            };
            xhr.send(JSON.stringify(data));
            return deferred.promise();
        };
        Gemini4Communicator.prototype.search = function (query) {
            return this.ajax(this.geminiUrl() + 'issues.ashx/issues/mywork', {}, 'GET');
            //return this.ajax(this.geminiUrl() + 'issues.ashx/issues/filters', {SearchKeywords: query});
        };
        return Gemini4Communicator;
    })();

    var GeminiCommunicator = (function () {
        var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;
        function GeminiCommunicator() {
            this.geminiUrl = function () {
                return localStorage["GeminiUrl"]+ "/api/";
            };
            this.geminiUsername = function () {
                return window.btoa(localStorage["UserName"] + ':' + localStorage["APIKey"]);
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
                if (xhr.readyState == 4 && xhr.status == 200) {
                    deferred.resolve(JSON.parse(xhr.responseText));
                }
            };
            xhr.send(JSON.stringify(data));
            return deferred.promise();
        };
        return GeminiCommunicator;
    })();
    return localStorage['GeminiVersion'] == '4' ? Gemini4Communicator : GeminiCommunicator;
});