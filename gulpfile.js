const gulp = require('gulp');
const sass = require('gulp-sass');
const cleanCss = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');

gulp.task('js', function() {
  return gulp.src('./src/static/js/**/*.js')
    .pipe(gulp.dest('./site/js/'));
});

gulp.task('css', function() {
  return gulp.src('./src/static/sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(cleanCss())
    .pipe(autoprefixer())
    .pipe(gulp.dest('./site/style'));
});

gulp.task('default', gulp.parallel('css', 'js'));

gulp.task('watch', function() {
  gulp.watch('src/static/sass/**/*.scss', gulp.series('css'));
  gulp.watch('src/static/js/**/*.js', gulp.series('js'));
});

