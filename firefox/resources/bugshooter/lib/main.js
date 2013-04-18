var pageMod = require("page-mod");
var data = require("self").data;
var toolbarButton = require('toolbarButton');

pageMod.PageMod({
    include: 'resource://jid1-aenehtehxohyuw-at-jetpack/bugshooter/data/common/editor.html',
    contentScriptFile: data.url("content.js"),
    contentScriptWhen: "end",
    onAttach: function(worker) {
        worker.port.emit("message", toolbarButton.getScreenCapture() );
    }
});

toolbarButton.init();