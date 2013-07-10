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
    return Communicator;
});
