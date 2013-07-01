module.exports = function(grunt) {
    var path = require('path');
    grunt.initConfig({
        symlink: {
            firefox: {
                target: path.resolve('chrome/common'),
                link: path.resolve('firefox/resources/bugsnap/data/common')
            }
        },
        clean: ['firefox/resources/bugsnap/data/common'],
        crx: {
            bugsnap: {
                "src": "chrome/",
                "dest": "build/chrome.crx"
            }
        },
        zip: {
            'build/firefox.xpi': ['firefox/*']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-crx');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask('default', ['crx', 'zip']);
    grunt.registerTask('install', ['symlink']);
    grunt.registerTask('uninstall', ['clean']);
};