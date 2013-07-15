define(['lib/knockout'], function (ko) {
    var FieldInfo = (function () {
        function FieldInfo(options) {
            this.Caption = ko.observable(options.Caption);
            this.Options = ko.observableArray();
            this.Value = ko.observable();
            this.Options.subscribe(function () {
                var fieldsHash = localStorage['fields'] ? JSON.parse(localStorage['fields']) : {};
                var initialValue = fieldsHash[this.Caption()];
                if (initialValue) {
                    this.Value(initialValue);
                }
            }, this);
            this.Option = ko.computed(function () {
                var options = this.Options();
                for (var i = 0; i < options.length; i++) {
                    if (options[i].Id === this.Value()) {
                        return options[i];
                    }
                }
                return undefined;
            }, this);
        }
        FieldInfo.prototype.Save = function () {
            var fieldsHash = localStorage['fields'] ? JSON.parse(localStorage['fields']) : {};
            fieldsHash[this.Caption()] = this.Value();
            localStorage['fields'] = JSON.stringify(fieldsHash);
        }
        return FieldInfo;
    })();
    return FieldInfo;
});
