require.config({
    paths: {
        'jquery': 'js/jquery',
        'knockout': 'js/knockout',
        'raphael': 'js/raphael',
        'md5': 'js/md5',
    },
	shim: {
        'js/jquery.validate': ['jquery'],
        'js/jquery.ui': ['jquery']
    }
});
define(['js/jquery', 'js/knockout', 'js/raphael', 'js/jquery.ui', 'js/jquery.validate', 'js/md5'], function ($, ko, Raphael) {

	
	var OptionsPageViewModel = (function () {
        function OptionsPageViewModel(options) {
            this.Parent = options.Parent;
            this.GeminiUrl = ko.observable(localStorage["GeminiUrl"]);
            this.UserName = ko.observable(localStorage["UserName"]);
			var pwd = localStorage["AuthString"];
			pwd = pwd != null ? pwd.substring(0, localStorage["passwordLength"] - 1): '';
            this.Password = ko.observable(pwd);
            this.APIKey = ko.observable(localStorage["APIKey"]);
            this.init();
        }
        OptionsPageViewModel.prototype.init = function () {
            var self = this;
			$("input[type=button], a, button").button();
			$("#method").buttonset();
			$("#password").hide();
			$('input[name=method]').change(
				function() {
					if($('input[name=method]:checked').val() == 'Password') {
						$("#password").show();
						$("#apiKey").hide();
					}
					else {
						$("#password").hide();
						$("#apiKey").show();
					}
					
				}
			);
        };
		OptionsPageViewModel.prototype.test = function () {
            if($("#optionsForm").valid()) {
				return $.ajax({
					url: this.GeminiUrl() + "/api/users/username/" + this.UserName(),
					type: "GET",
					headers: { "Authorization": "Basic " + window.btoa(this.UserName() + ':' + this.APIKey()) },
					success: function(data) {
							$(".confirmationMessage").stop().hide().text("Successfully connected to Gemini!").fadeIn(400, function() {
								$(this).delay(1700).fadeOut(400);
							});
						},
					error: function(jqXHR, textStatus, errorThrown) {
						if(textStatus == 'timeout' || errorThrown == "Not Found")
							$(".confirmationMessage").stop().hide().text("Unable to connect to Gemini at specified URL.").fadeIn(400, function() {
								$(this).delay(1700).fadeOut(400);
							});
						if(errorThrown == "Forbidden")
							$(".confirmationMessage").stop().hide().text("Unable to login using supplied credentials.").fadeIn(400, function() {
								$(this).delay(1700).fadeOut(400);
							});
					}
					
				});
			}
        };
        OptionsPageViewModel.prototype.save = function () {
            if($("#optionsForm").valid()) {
				if($('input[name=method]:checked').val() != 'Password') {
					localStorage["AuthMethod"] = "apikey";
					localStorage["GeminiUrl"] = this.GeminiUrl();
					localStorage["UserName"] = this.UserName();
					localStorage["APIKey"] = this.APIKey();
				}
				else {
					localStorage["AuthMethod"] = "password";
					localStorage["GeminiUrl"] = this.GeminiUrl();
					localStorage["UserName"] = this.UserName();
					var authString = md5(this.Password());
					localStorage["passwordLength"] = this.Password().length;
					localStorage["APIKey"] = this.APIKey();
					localStorage["AuthString"] = authString;
				}
				$(".confirmationMessage").stop().hide().text("Options saved.").fadeIn(400, function() {
						$(this).delay(1000).fadeOut(400);
					});
			}
        };
        return OptionsPageViewModel;
    })();
	
	var PageViewModel = (function () {
        function PageViewModel() {
            this.OptionsPage = new OptionsPageViewModel({Parent: this});
        }
        return PageViewModel;
    })();
    ko.applyBindings(new PageViewModel());
});