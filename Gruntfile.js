module.exports = function(grunt) {
    var path = require('path');
    grunt.initConfig({
        symlink: {
            firefox: {
                target: path.resolve('chrome/common'),
                link: path.resolve('firefox/data')
            }
        },
        clean: ['firefox/data', 'addon-sdk-1.14'],
        zip: {
            'build/firefox.xpi': ['firefox/**'],
            'build/chrome.zip': ['chrome/**']
        },
        unzip: {
            firefox: {
                src: 'addon-sdk-1.14.zip',
                dst: ''
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask('default', ['zip']);
    grunt.registerTask('install', ['unzip', 'symlink']);
    grunt.registerTask('uninstall', ['clean']);
};