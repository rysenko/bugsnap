require.config({
    paths: {
        'jquery': 'js/jquery',
        'knockout': 'js/knockout',
        'raphael': 'js/raphael',
        'md5': 'js/md5'
    },
    shim: {
        'js/jquery.validate': ['jquery'],
        'js/jquery.ui': ['jquery']
    }
});
define(['js/jquery', 'js/knockout', 'js/raphael', 'js/jquery.ui', 'js/jquery.validate', 'js/md5'], function ($, ko, Raphael) {

    
    var OptionsPageViewModel = (function () {
        function OptionsPageViewModel(options) {
            this.GeminiUrl = ko.observable(localStorage["GeminiUrl"]);
            this.UserName = ko.observable(localStorage["UserName"]);
            var pwd = localStorage["AuthString"];
            pwd = pwd != null ? pwd.substring(0, localStorage["passwordLength"] - 1): '';
            this.Password = ko.observable(pwd);
            this.APIKey = ko.observable(localStorage["APIKey"]);
            this.Version = ko.observable(localStorage['GeminiVersion'] || '5');

            $('#optionsForm :input[type="text"]').keydown(function() {
                $('#saveBtn').prop('value', '*Save');
            });
        }
        OptionsPageViewModel.prototype.save = function () {
            if($("#optionsForm").valid()) {
                var deferred = $.Deferred();
                var self = this;
                var xhr = new XMLHttpRequest();
                if (this.Version() == '5') {
                    xhr.open('GET', this.GeminiUrl() + "/api/users/username/" + this.UserName(), true);
                    xhr.setRequestHeader('Accept', "*/*", false);
                    if(window.navigator.userAgent.indexOf('Firefox') == -1){
                        xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(this.UserName() + ':' + this.APIKey()));
                        xhr.setRequestHeader('Content-Type', 'application/json');
                    }
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == 4 && xhr.status == 200) {
                            if(xhr.responseText === "null") {
                                $(".confirmationMessage").stop().hide().text("Unable to login using supplied credentials.").fadeIn(400, function() {
                                    $(this).delay(1700).fadeOut(400);
                                });
                            } else {
                                localStorage["AuthMethod"] = "apikey";
                                localStorage["GeminiUrl"] = self.GeminiUrl();
                                localStorage["UserName"] = self.UserName();
                                localStorage["APIKey"] = self.APIKey();
                                localStorage['GeminiVersion'] = self.Version();
                                $(".confirmationMessage").stop().hide().text("Credentials are successfully saved.").fadeIn(400, function() {
                                    $(this).delay(1700).fadeOut(400);
                                });                            
                                $('#saveBtn').prop('value', 'Save');
                            } 
                        } else if (xhr.readyState == 4 && xhr.status != 200) {
                            if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                                $(".confirmationMessage").stop().hide().text("Unable to connect to Gemini at specified URL.").fadeIn(400, function() {
                                    $(this).delay(1700).fadeOut(400);
                                });
                            }
                            if(xhr.statusText == "Forbidden") {
                                $(".confirmationMessage").stop().hide().text("Unable to login using supplied credentials.").fadeIn(400, function() {
                                    $(this).delay(1700).fadeOut(400);
                                });
                            }
                        }
                    };
                    xhr.send();
                } else {
                    xhr.open('GET', self.GeminiUrl() + '/api/projects.ashx/projects?format=json&gemini-username-token='
                        + window.btoa(self.UserName()) + '&gemini-api-token=' + window.btoa(self.APIKey()));
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState == 4 && xhr.status == 200) {
                            if(xhr.responseText === "null") {
                                $(".confirmationMessage").stop().hide().text("Unable to login using supplied credentials.").fadeIn(400, function() {
                                    $(this).delay(1700).fadeOut(400);
                                });
                            } else {
                                localStorage["AuthMethod"] = "apikey";
                                localStorage["GeminiUrl"] = self.GeminiUrl();
                                localStorage["UserName"] = self.UserName();
                                localStorage["APIKey"] = self.APIKey();
                                localStorage['GeminiVersion'] = self.Version();
                                $(".confirmationMessage").stop().hide().text("Credentials are successfully saved.").fadeIn(400, function() {
                                    $(this).delay(1700).fadeOut(400);
                                });                            
                                $('#saveBtn').prop('value', 'Save');
                            }
                        } else if (xhr.readyState == 4 && xhr.status != 200) {
                            $(".confirmationMessage").stop().hide().text("Unable to connect to Gemini at specified URL.").fadeIn(400, function() {
                                $(this).delay(1700).fadeOut(400);
                            });
                        }
                    }
                    xhr.send();
                }
                xhr.send();
                return deferred.promise();
            }
        };
        return OptionsPageViewModel;
    })();
    
    ko.applyBindings(new OptionsPageViewModel());
});