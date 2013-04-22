bugSnapFF = {
    start: function() {
        self.port.on("message", function(tag) {     
            localStorage.setItem("screenshot", tag.capture);
        });
    }
};
bugSnapFF.start();
