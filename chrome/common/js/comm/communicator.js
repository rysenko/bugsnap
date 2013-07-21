define([], function () {
    var Communicator = (function () {
        function Communicator(settings) {
            this.Settings = function () {
                var stored = localStorage['CommunicatorSettings'] ? JSON.parse(localStorage['CommunicatorSettings']) : {};
                return settings || stored;
            };
            this.Url = function () {
                var url = this.Settings().Url;
                if (url && url.lastIndexOf('/') != url.length - 1) {
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
        }
        Communicator.prototype.getFields = function () {
            return {};
        };
        Communicator.prototype.saveFields = function (fields) {
            for (var i in fields) {
                fields[i].Save();
            }
        };
        Communicator.prototype.getRedirectUrl = function (issueId, fields) {
            this.saveFields(fields);
            return 'about:blank';
        };
        return Communicator;
    })();
    return Communicator;
});
