chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.captureVisibleTab(null, {
            format: "png"
        }, function (data) {
            localStorage.setItem("screenshot", data);
            chrome.tabs.create({
                index: tab.index + 1,
                url: "editor.html"
            }, function (tab) {
                // DOES NOTHING FOR NOW
            });

        });
    });
});
