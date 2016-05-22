module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bower_concat: {
      all: {
        dest: 'build/bower.js',
        cssDest: 'build/bower.css',
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
            'build/bower.css'
          ]
        }
      }
    },
    uglify: {
      my_target: {
        files: {
          'build/bower.min.js': ['build/bower.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['bower_concat', 'cssmin', 'uglify']);
};
