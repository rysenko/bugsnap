require.config({
    paths: {
        'jquery': 'js/jquery',
        'knockout': 'js/knockout'
    },
    shim: {
        'js/jquery.validate': ['jquery'],
        'js/jquery.ui': ['jquery']
    }
});
define(['js/jquery', 'js/knockout', 'gemini', 'js/jquery.ui', 'js/jquery.validate'], function ($, ko, CommunicatorLoader) {
    var OptionsPageViewModel = (function () {
        function OptionsPageViewModel(options) {
            var settings = JSON.parse(localStorage['CommunicatorSettings'] || "{}");
            this.Url = ko.observable(settings.Url);
            this.Login = ko.observable(settings.Login);
            this.Password = ko.observable(settings.Password);
            this.Key = ko.observable(settings.Key);
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
            if($("#optionsForm").valid() && !this.UrlInvalid()) {
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
            }
        };
        return OptionsPageViewModel;
    })();
    
    ko.applyBindings(new OptionsPageViewModel());
});