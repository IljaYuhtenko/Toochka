var options = {
    stripBanners: true,
    banner      : '/**\n' +
    ' * Application:  <%= pkg.name %>\n' +
    ' * Version:      <%= pkg.version %>\n' +
    ' * Release date: <%= grunt.template.today("yyyy-mm-dd") %>\n' +
    ' * Author:       <%= pkg.author %> (<%= pkg.authorPage %>)\n' +
    ' * Homepage:     https://github.com/StepanMas/jQuery.miniNoty\n' +
    ' * License:      <%= pkg.license %>\n' +
    '*/\n\n'
}

module.exports = function (grunt)
{

    grunt.initConfig(
        {
            pkg: grunt.file.readJSON('package.json'),

            uglify: {
                options: options,
                build  : {
                    src : '<%= pkg.name %>.js',
                    dest: '<%= pkg.name %>.min.js'
                }
            },
            watch : {
                scripts: {
                    files  : ['<%= pkg.name %>.js'],
                    tasks  : ['uglify'],
                    options: {
                        spawn: false
                    }
                }
            }

        }
    );

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['uglify', 'watch']);

};