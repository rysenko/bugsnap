module.exports = function(grunt) {

  grunt.initConfig({
    symlink: {
      chrome: {
        target: 'common',
        link: 'chrome/common',
        options: {
          overwrite: true,
          force: true
        }
      },
      firefox: {
        target: 'common',
        link: 'firefox/resources/bugsnap/data/common',
        options: {
          overwrite: true,
          force: true
        }
      }
    },
    clean: ['chrome/common', 'firefox/resources/bugsnap/data/common']
  });

  grunt.loadNpmTasks('grunt-contrib-symlink');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('install', ['symlink']);
  grunt.registerTask('uninstall', ['clean']);
};