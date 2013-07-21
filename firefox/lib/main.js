const widgets = require("sdk/widget");
const data = require("sdk/self").data;
var tabs = require("sdk/tabs");

var bug = widgets.Widget({
    id: 'bugsnap',
    width: 16,
    label: "BugSnap",
    content: '<img src="' + data.url("img/16.png") + '">',
    onClick: function() {
        tabs.open(data.url('editor.html'));
    }
});