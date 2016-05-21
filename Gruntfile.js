module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bower_concat: {
      all: {
        dest: 'build/_bower.js',
        cssDest: 'build/_bower.css',
        bowerOptions: {
          relative: false
        },
        dependencies: {
          'typeahead.js': 'jquery'
        }
      }
    },
    cssmin: {
      target: {
        files: {
          'build/build.min.css': [
            'css/bootstrap/bootstrap-theme.min.css',
            'css/bootstrap/bootstrap.min.css',
            'build/_bower.css'
          ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['bower_concat', 'cssmin']);
};
