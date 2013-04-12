(function () {
    var myId = "bugshooter-toolbar-button"; // ID of button to add
    var afterId = "home-button"; // ID of element to insert after
    var navBar = document.getElementById("nav-bar");
    var curSet = navBar.currentSet.split(",");

    if (curSet.indexOf(myId) == -1) {
        var pos = curSet.indexOf(afterId) + 1 || curSet.length;
        curSet.splice(pos, 0, myId);

        navBar.setAttribute("currentset", curSet.join(","));
        navBar.currentSet = curSet.join(",");
        document.persist(navBar.id, "currentset");
        try {
            BrowserToolboxCustomizeDone(true);
        } catch (e) {}
    }
})();