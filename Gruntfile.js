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
    clean: ['chrome/common', 'firefox/resources/bugsnap/data/common']
  });

  grunt.loadNpmTasks('grunt-contrib-symlink');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('install', ['symlink']);
  grunt.registerTask('uninstall', ['clean']);
};