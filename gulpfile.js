require('babel-polyfill');
var gulp = require('gulp');
var browserSync = require('browser-sync').create('my server');
var babel = require('gulp-babel'),
    sass = require('gulp-sass'),
    sassGlob = require('gulp-sass-glob'),
    eslint = require('gulp-eslint'),
    autoprefixer = require('gulp-autoprefixer')
    cleanCSS = require('gulp-clean-css')
    rename = require("gulp-rename");

gulp.task('serve', ['sass'], function () {

    browserSync.init({
        server: {
            baseDir: "./"
        }
    });

    gulp.watch('scss/*.scss', ['sass']);
    gulp.watch('scss/partials/*.scss', ['sass']);
    gulp.watch('build/css/style.css', ['minify']);
    gulp.watch('js/*.js', ['js']).on('change', function () {
        browserSync.reload();
    });
    gulp.watch("*.html").on('change', function () {
        browserSync.reload();
    });
});

gulp.task('sass', function () {
    return gulp.src(["scss/style.scss"])
        .pipe(sassGlob())
        .pipe(sass({ outputStyle: 'expanded', includePath: ['scss/partials'] }).on('error', sass.logError))
        .pipe(autoprefixer({ browsers: ['>0%'] }))
        .pipe(gulp.dest('build/css'))
        .pipe(browserSync.stream());
});
gulp.task('minify', () => {
    return gulp.src('build/css/*.css')
        .pipe(cleanCSS())
        .pipe(rename('style.min.css'))
        .pipe(gulp.dest('build/css'));
})
gulp.task('js', function () {
    return gulp.src("js/main.js")
        .pipe(eslint({
            extends: 'airbnb',
            rules: {
                'strict': 2
            },
            globals: [
                'jQuery',
                '$'
            ],
            envs: [
                'browser'
            ],
            parserOptions: {
                'ecmaVersion': 6,
               sourcetype: 'module',
            }
        }))
        .pipe(eslint.format())
        .pipe(babel())
        .pipe(gulp.dest('build/js'))
})

gulp.task('default', ['serve']);