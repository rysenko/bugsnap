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
            this.Password = ko.observable(localStorage["Password"]);
            this.APIKey = ko.observable(localStorage["APIKey"]);
            this.init();
        }
        OptionsPageViewModel.prototype.init = function () {
            var self = this;
			$("input[type=button], a, button").button();
			$("#method").buttonset();
			$("#password").hide();
            $("#optionsForm").validate();
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
        OptionsPageViewModel.prototype.save = function () {
            if (this.GeminiUrl() != null) {
				localStorage["GeminiUrl"] = this.GeminiUrl();
				localStorage["UserName"] = this.UserName();
				localStorage["Password"] = this.Password();
				localStorage["APIKey"] = this.APIKey();
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