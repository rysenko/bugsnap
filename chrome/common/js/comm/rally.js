define(['lib/jquery', 'comm/Communicator', 'comm/FieldInfo'], function ($, Communicator, FieldInfo) {
    var RallyCommunicator = (function (_super) {
        RallyCommunicator.prototype = Object.create(_super.prototype);
        function RallyCommunicator(settings) {
            _super.call(this, settings);
            this.Url = function () {
                return 'https://rally1.rallydev.com/slm/webservice/v2.0/';
            };
            this.SecurityToken = '';
            this.UserId = '';
        }
        RallyCommunicator.prototype.getIdFromUrl = function (url) {
            var slashPos = url.lastIndexOf('/');
            return url.substring(slashPos + 1);
        };
        RallyCommunicator.prototype.authenticate = function () {
            var self = this;
            return this.ajax(this.Url() + 'security/authorize', {}, 'GET').then(function (result) {
                self.SecurityToken = result.OperationResult.SecurityToken;
                return self.ajax(self.Url() + 'user', {}, 'GET').then(function (result) {
                    self.UserId = self.getIdFromUrl(result.User._ref);
                });
            });
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
            var self = this;
            var rallyQuery = '(Name contains "' + query + '")';
            return this.ajax(this.Url() + 'defect?query=' + encodeURIComponent(rallyQuery), {}, 'GET').then(function (data) {
                return $.map(data.QueryResult.Results, function (item) {
                    return {Id: self.getIdFromUrl(item._ref), Name: item._refObjectName};
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
            var self = this;
            var contentData = {attachmentcontent: {Content: fileContent}};
            return this.ajax(this.Url() + 'attachmentcontent/create?key=' + this.SecurityToken, contentData).then(function (result) {
                var attachmentData = {attachment: {
                    Artifact: 'artifact/' + issueId,
                    Name: 'screenshot.png',
                    Content: 'attachmentcontent/' + result.CreateResult.Object.ObjectID,
                    ContentType: 'image/png',
                    Size: atob(fileContent).length,
                    User: 'user/' + self.UserId
                }};
                return self.ajax(self.Url() + 'attachment/create?key=' + self.SecurityToken, attachmentData);
            });
        };
        RallyCommunicator.prototype.comment = function (issueId, comment) {
            var data = {conversationpost: {
                Artifact: 'artifact/' + issueId,
                Text: comment,
                User: 'user/' + this.UserId
            }};
            return this.ajax(this.Url() + 'conversationpost/create?key=' + this.SecurityToken, data);
        };
        RallyCommunicator.prototype.getUrl = function (issueId, fields) {
            var fieldsHash = this.getHash(fields);
            return 'https://rally1.rallydev.com/#/' + fieldsHash.project.Id + 'd/detail/defect/' + issueId;
        };
        RallyCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true, this.Login(), this.Password());
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        try {
                            var result = JSON.parse(xhr.responseText);
                            if (result['CreateResult'] && result.CreateResult.Errors.length > 0) {
                                console.log(result.CreateResult.Errors);
                                deferred.reject(result.CreateResult.Errors);
                            } else {
                                deferred.resolve(result);
                            }
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
            xhr.send(JSON.stringify(data));
            return deferred.promise();
        };
        return RallyCommunicator;
    })(Communicator);
    return RallyCommunicator;
});
