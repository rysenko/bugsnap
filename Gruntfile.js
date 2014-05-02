module.exports = function(grunt) {
    var path = require('path');
    grunt.initConfig({
        zip: {
            'build/chrome.zip': ['chrome/**']
        }
    });

    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask('default', ['zip']);
};