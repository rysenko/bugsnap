var bugShooter = {};
bugShooter.run = function() {
    var topDoc = top.document,
        gBrowser = top.gBrowser,
        appcontent = topDoc.getElementById('appcontent'),
        overlay = topDoc.getElementById('bugshooter-takeover-frame');
        pageAttr = 'bugshooterOverlayPage',
    url = 'chrome://bugshooter/content/editor.html';
//   overlay.setAttribute('src', 'about:blank');
    overlay.setAttribute('src', url);
    overlay.setAttribute('hidden', 'false');
    appcontent.setAttribute('collapsed', 'true');
    gBrowser.selectedBrowser.setAttribute(pageAttr, 'screenshot');
}


