define(['js/jquery'], function ($) {
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
        GeminiCommunicator.prototype.create = function (projectId, title, description) {
            var data = {
                    ProjectId: projectId,
                    Title: title,
                    Description: description,      
                    ReportedBy: "1"
                };
            return this.ajax(this.geminiUrl() + "items/", data);
        };
        GeminiCommunicator.prototype.ajax = function(url, data) {            
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
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
    return GeminiCommunicator;
});