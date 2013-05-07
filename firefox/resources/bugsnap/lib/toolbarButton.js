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
    var toolbarbutton = document.createElement("toolbarbutton");    
    toolbarbutton.id = 'bugsnap-screenshot-toolbarbutton';
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
            allowScriptsToCloseWindows(true);
            forcecors.enable();
        }
    });
    tab.on('activate', function(tab){   
        if(tab.title.indexOf('BugSnap') != -1) {
            allowScriptsToCloseWindows(true);
            forcecors.enable();
        }
    });
    tab.on('deactivate', function(tab){   
        if(tab.title.indexOf('BugSnap') != -1) {
            allowScriptsToCloseWindows(false);
            forcecors.disable();
        }
    });
    tab.on('close', function(tab){   
        allowScriptsToCloseWindows(false);
        forcecors.disable();
    });
});

function allowScriptsToCloseWindows(allow) {
    var prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    prefService.setBoolPref("dom.allow_scripts_to_close_windows", allow);
};

function Forcecors() {
    this.observer = {
        observe: function(subject, topic, data) {
            var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
            if (topic == "http-on-modify-request") {
                var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
                var uri = ios.newURI('resource://jid1-aenehtehxohyuw-at-jetpack/bugsnap/data/common/editor.html', null, null);
                var cookieService = Cc["@mozilla.org/cookieService;1"].getService(Ci.nsICookieService);
                var auth = cookieService.getCookieString(uri, null).split('=');                

                httpChannel.setRequestHeader('Content-Type', 'application/json', false);
                httpChannel.setRequestHeader('Authorization', "Basic " + auth[1], false);
            } else if (topic == "http-on-examine-response") {
                httpChannel.setResponseHeader('Access-Control-Allow-Origin', "*", false);
            }
        }
    };
};

Forcecors.prototype.enable = function() {
    var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    os.addObserver(this.observer, "http-on-modify-request", false);
    os.addObserver(this.observer, "http-on-examine-response", false);
};

Forcecors.prototype.disable = function() {
    var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    os.removeObserver(this.observer, "http-on-modify-request");
    os.removeObserver(this.observer, "http-on-examine-response");
};

var forcecors = new Forcecors();

exports.init = init;
exports.getScreenCapture = getScreenCapture;