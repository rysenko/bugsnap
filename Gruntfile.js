module.exports = function(grunt) {
  var path = require('path');
  grunt.initConfig({
    symlink: {
      chrome: {
        target: path.resolve('common'),
        link: path.resolve('chrome/common')
      },
      firefox: {
        target: path.resolve('common'),
        link: path.resolve('firefox/resources/bugsnap/data/common')
      }
    },
    clean: ['chrome/common', 'firefox/resources/bugsnap/data/common'],
    crx: {
      myPublicPackage: {
        "src": "chrome/",
        "dest": "."
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-symlink');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-crx');

  grunt.registerTask('default', ['crx']);
  grunt.registerTask('install', ['symlink']);
  grunt.registerTask('uninstall', ['clean']);
};