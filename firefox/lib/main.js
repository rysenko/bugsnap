const widgets = require("sdk/widget");
const data = require("sdk/self").data;
var tabs = require("sdk/tabs");

var bug = widgets.Widget({
    id: 'bugsnap',
    width: 16,
    label: "BugSnap",
    content: '<img src="' + data.url("img/16.png") + '">',
    onClick: function() {
        var imgData = tabs.activeTab.getThumbnail();
        //localStorage.setItem("screenshot", imgData);
        tabs.open({
            url: data.url('editor.html'),
            onOpen: function onOpen (tab) {
                var worker = tab.attach({
                    contentScript: "self.port.on('alert', function(message) {" +
                        "  localStorage.setItem('screenshot' , message);" +
                        "})"
                });
                worker.port.emit("alert", imgData);
            }
        });
    }
});