define(['lib/knockout'], function (ko) {
    var FieldInfo = (function () {
        function FieldInfo(options) {
            this.Id = options.Id;
            this.Caption = ko.observable(options.Caption);
            this.Options = ko.observableArray();
            this.Value = ko.observable();
        }

        return FieldInfo;
    })();
    return FieldInfo;
});
