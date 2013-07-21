module.exports = function(grunt) {
    var path = require('path');
    grunt.initConfig({
        symlink: {
            firefox: {
                target: path.resolve('chrome/common'),
                link: path.resolve('firefox/data/common')
            }
        },
        clean: ['firefox/data/common'],
        zip: {
            'build/firefox.xpi': ['firefox/**'],
            'build/chrome.zip': ['chrome/**']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask('default', ['zip']);
    grunt.registerTask('install', ['symlink']);
    grunt.registerTask('uninstall', ['clean']);
};