bugShooterFF = {
    start: function() {
        localStorage.removeItem("screenshot");
        self.port.on("message", function(tag) {     
            localStorage.setItem("screenshot", tag.capture);
        });
    }
};
bugShooterFF.start();
