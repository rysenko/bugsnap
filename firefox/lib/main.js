const widgets = require("sdk/widget");
const data = require("sdk/self").data;
var tabs = require("sdk/tabs");

function openEditor(imgData) {
    var content = "self.port.on('image', function (data) {" +
        "  localStorage.setItem('screenshot', data);" +
        "});";
    tabs.open({
        url: data.url("editor.html"),
        onReady: function (tab) {
            var worker = tab.attach({
                contentScript: content
            });
            worker.port.emit("image", imgData);
        }
    });
}

var bug = widgets.Widget({
    id: 'bugsnap',
    width: 16,
    label: "BugSnap",
    content: '<img src="' + data.url("img/16.png") + '">',
    onClick: function() {
        var imgData = tabs.activeTab.getThumbnail();
        openEditor(imgData);
    }
});