var {Cc, Ci, Cu} = require("chrome");
var data = require("self").data;
var tabs = require("tabs");
var { Hotkey } = require("hotkeys");
var window = require("sdk/window/utils").getMostRecentBrowserWindow();

var mediator;
var addonManager;
var screenCapture = {};

function init() {
	mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

    addonManager = Cu.import("resource://gre/modules/AddonManager.jsm").AddonManager;
    addonManager.addAddonListener({
        onDisabled: function(addon) {
            if (addon.id === 'jid1-AEnEhteHXOHYuw@jetpack') {
                removeToolbarButton();
            }   
        }
    });

    Hotkey({
        combo: "alt-shift-q",
        onPress: function() {
            makeScreenShot();
        }
    });

	return addToolbarButton();
};

function removeToolbarButton(){
    var document = mediator.getMostRecentWindow("navigator:browser").document;
    var addonBar = document.getElementById("nav-bar");
    var toolbarbutton = document.getElementById("bugsnap-screenshot-toolbarbutton");
    if (toolbarbutton) {
        addonBar.removeChild(toolbarbutton);
    }
};

function addToolbarButton(){
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var addonBar = document.getElementById("nav-bar");
    var buttonId = 'bugsnap-screenshot-toolbarbutton';
    var toolbarbutton = document.getElementById(buttonId);
    while (toolbarbutton) {
        toolbarbutton.remove();
        toolbarbutton = document.getElementById(buttonId);
    }
    toolbarbutton = document.createElement('toolbarbutton');
	toolbarbutton.id = buttonId;
	toolbarbutton.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
	toolbarbutton.setAttribute('image', data.url('common/img/16.png'));
	toolbarbutton.setAttribute('orient', 'horizontal');
	toolbarbutton.setAttribute('label', 'BugSnap');
	toolbarbutton.setAttribute('tooltiptext', 'BugSnap');
    toolbarbutton.addEventListener('mousedown', function(e) { makeScreenShot(); }, false);
	addonBar.appendChild(toolbarbutton);
};

function makeScreenShot() {
	var browser = mediator.getMostRecentWindow("navigator:browser").gBrowser;
    var window = browser.contentWindow;
    var document = window.document;
    var html = document.documentElement;
    var w, h, x, y;
    x = 0;
    y = html.scrollTop;
    w = html.clientWidth;
    h = html.clientHeight;

    var canvas = document.createElement('canvas');
    canvas.width = w; 
    canvas.height = h;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    var ctx = canvas.getContext("2d");
    ctx.drawWindow(window, x, y, w, h, 'rgb(255, 255, 255)');

    var base64Img = canvas.toDataURL();
    screenCapture = { capture: base64Img };

    tabs.open({url: data.url('common/editor.html')});
};

function getScreenCapture() {
	return screenCapture;
};

tabs.on('activate', function(tab) {
    tab.on('ready', function(tab){   
        if(tab.title.indexOf('BugSnap') != -1) {
            forcecors.enable();
        }
    });
    tab.on('activate', function(tab){   
        if(tab.title.indexOf('BugSnap') != -1) {
            forcecors.enable();
        }
    });
    tab.on('deactivate', function(tab){   
        if(tab.title.indexOf('BugSnap') != -1) {
            forcecors.disable();
        }
    });
    tab.on('close', function(tab){   
        if(tab.title.indexOf('BugSnap') != -1) {
            forcecors.disable();
        }
    });
});

function Forcecors() {
    this.observer = {
        observe: function(subject, topic, data) {
            var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
            if (topic == "http-on-modify-request") {
                httpChannel.setRequestHeader('Authorization', "Basic " + window.btoa('manager:qjbpnsqg6i'), false);
            }
        }
    };
};

Forcecors.prototype.enable = function() {
    var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    os.addObserver(this.observer, "http-on-modify-request", false);
};

Forcecors.prototype.disable = function() {
    var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    os.removeObserver(this.observer, "http-on-modify-request");
};

var forcecors = new Forcecors();

exports.init = init;
exports.getScreenCapture = getScreenCapture;