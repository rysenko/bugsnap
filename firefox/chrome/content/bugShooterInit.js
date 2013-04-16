var bugShooter = {};

bugShooter.run = function() {
    var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                   .getService(Components.interfaces.nsIWindowMediator);
    var window = mediator.getMostRecentWindow("navigator:browser").gBrowser.contentWindow;
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

    url = 'chrome://bugshooter/content/common/editor.html';

    var data = canvas.toDataURL();

    // TODO: find better way to send data to target page
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI(url, null, null);
    var cookieService = Components.classes["@mozilla.org/cookieService;1"].getService(Components.interfaces.nsICookieService);
    var arr = [], i = 1;
    arr[0] = data.substring(0, data.indexOf(';') + 1);
    data = data.substring(arr[0].length);
    while(data.length > 0){
        if(data.length < 2000){
            arr[i] = data.substring(0);
            data = 0;
        } else{
            arr[i] = data.substring(0, 2000);
            data = data.substring(2000);                        
        }
        i++;
    }
    for (var i = 1; i <= arr.length; i++) {
        var cookieString = "screenshot" + i + "=" + arr[i-1];
        cookieService.setCookieString(uri, null, cookieString, null);
    };

    gBrowser.addTab(url);
    gBrowser.tabContainer.advanceSelectedTab(1, true);
}
