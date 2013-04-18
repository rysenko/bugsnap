bugShooterFF = {
    start: function() {
        self.port.on("message", function(tag) {     
            localStorage.setItem("screenshot", tag.capture);
        });
    }
};
bugShooterFF.start();
