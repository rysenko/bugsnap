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
        shell: {
            unzip: {
                 command: 'unzip addon-sdk-1.14.zip'
            },
            run : {
                command: 'cd addon-sdk-1.14; source bin/activate; cd ../firefox; cfx run',
                options: {
                    stdout: true,
                    stderr: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-zip');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', ['zip']);
    grunt.registerTask('install', ['shell:unzip', 'symlink']);
    grunt.registerTask('run', ['shell:run']);
    grunt.registerTask('uninstall', ['clean']);
};