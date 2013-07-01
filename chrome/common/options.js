requirejs.config({
    shim: {
        'js/jquery.ui.src': {deps: ['js/jquery.src']}
    }
});

define(['js/jquery', 'js/knockout', 'js/knockout.validation', 'communicator', 'js/jquery.ui'], function ($, ko, kov, CommunicatorLoader) {
    var OptionsPageViewModel = (function () {
        function OptionsPageViewModel(options) {
            var settings = JSON.parse(localStorage['CommunicatorSettings'] || "{}");
            this.Url = ko.observable(settings.Url).extend({required: true});
            this.Login = ko.observable(settings.Login).extend({required: true});
            this.Password = ko.observable(settings.Password).extend({required: true});
            this.Key = ko.observable(settings.Key).extend({required: true});
            this.Type = ko.observable(localStorage['CommunicatorType'] || 'Gemini');
            this.UrlInvalid = ko.computed(function () {
                return !(/^http(s)?\:\/\/[a-z0-9-\\.@:%_\+~#=]+((\.)?[a-z0-9]+)*(:[0-9]{1,5})?(\/.*)*$/.test(this.Url()));
            }, this);
            this.KeyVisible = ko.computed(function () {
                return this.Type() == 'Gemini';
            }, this);
            this.PasswordVisible = ko.computed(function () {
                return !this.KeyVisible();
            }, this);
            this.Errors = ko.computed(function () {
                if (this.KeyVisible()) {
                    return ko.validation.group([this.Url, this.Login, this.Key]);
                }
                return ko.validation.group([this.Url, this.Login, this.Password]);
            }, this);
            $('#optionsForm :input[type="text"]').keydown(function() {
                $('#saveBtn').prop('value', '* Save');
            });
        }
        OptionsPageViewModel.prototype.getSettings = function () {
            return {
                Url: this.Url(),
                Login: this.Login(),
                Password: this.Password(),
                Key: this.Key()
            };
        };
        OptionsPageViewModel.prototype.save = function () {
            if (this.Errors()().length > 0 || this.UrlInvalid()) {
                this.Errors().showAllMessages();
                return;
            }
            $(".confirmationMessage").stop().hide().text("Testing...").show();
            $('#saveBtn').prop('disabled', 'disabled');
            var settings = this.getSettings();
            var type = this.Type();
            var CommunicatorClass = CommunicatorLoader(type);
            var communicator = new CommunicatorClass(settings);
            communicator.test().fail(function(text) {
                $(".confirmationMessage").stop().hide().text(text).show().delay(1700).fadeOut(400, function() {
                    $('#saveBtn').prop('disabled', '');
                });
            }).done(function () {
                localStorage['CommunicatorSettings'] = JSON.stringify(settings);
                localStorage['CommunicatorType'] = type;
                $(".confirmationMessage").stop().hide().text("Credentials are successfully saved.").show().delay(1700).fadeOut(400, function() {
                    $('#saveBtn').prop('disabled', '').prop('value', 'Save');
                });
            });
        };
        return OptionsPageViewModel;
    })();
    
    ko.applyBindings(new OptionsPageViewModel());
});