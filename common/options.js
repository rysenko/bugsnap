define(['js/jquery', 'js/knockout', 'js/raphael', 'js/jquery.ui'], function ($, ko, Raphael) {

	
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

function save_options() {
  var select = document.getElementById("color");
  var color = select.children[select.selectedIndex].value;
  localStorage["favorite_color"] = color;

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var favorite = localStorage["favorite_color"];
  if (!favorite) {
    return;
  }
  var select = document.getElementById("color");
  for (var i = 0; i < select.children.length; i++) {
    var child = select.children[i];
    if (child.value == favorite) {
      child.selected = "true";
      break;
    }
  }
}
//document.addEventListener('DOMContentLoaded', restore_options);
//document.querySelector('#save').addEventListener('click', save_options);
});