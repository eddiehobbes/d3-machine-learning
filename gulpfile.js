var gulp = require('gulp');
var del = require('del');
var config = require('./gulp.config')();

var $ = require('gulp-load-plugins')({lazy: true});

var browserSync = require('browser-sync').create();
var browserify = require('browserify');
var es = require('event-stream');
var series = require('stream-series');
var karma = require('karma').server;

var port = process.env.PORT || config.defaultPort;

gulp.task('help', $.taskListing);

gulp.task('default', ['help']);

gulp.task('templatecache', ['clean-code'], function() {
    return gulp.src(config.htmlTemplates)
        .pipe($.uglify())
        .pipe($.angularTemplatecache(config.templateCache.file, config.templateCache.options))
        .pipe(gulp.dest(config.temp))

});

gulp.task('fonts', ['clean-fonts'], function() {
    return gulp.src(config.fonts)
        .pipe(gulp.dest(config.dist + 'fonts'));
});

gulp.task('images', ['clean-images'], function() {
    return gulp.src(config.images)
        .pipe($.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest(config.dist + 'images'));
});

gulp.task('wiredep', function() {
    var wiredep = require('wiredep').stream;
    log(config.index);
    // log(config.d3machine);

    return gulp.src(config.index)
        .pipe(wiredep(config.wiredepConfig()))
        .pipe($.inject(gulp.src(config.wireJS), {name: 'inject-js'}))
        .pipe(gulp.dest(config.d3machine));
});

gulp.task('inject', ['wiredep', 'sass'], function() {
    return gulp.src(config.index)
        .pipe($.inject(gulp.src(config.css), {name:'inject-css'}))
        .pipe(gulp.dest(config.d3machine));
});

//Build css from sass
gulp.task('sass', ['clean-styles'], function() {
  return gulp.src(config.sass)
    .pipe($.plumber())
    .pipe($.sass())
    .pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
    .pipe(gulp.dest(config.temp))
});

gulp.task('lint', function() {
    gulp.src(config.js)
    .pipe($.eslint({
        config: '.eslintrc'
    }))
    .pipe($.eslint.format());
});

gulp.task('clean', function(done) {
    var delDir = [].concat(config.dist, config.temp);
    del(delDir, done);
});

gulp.task('clean-styles', function(done) {
    clean(config.css, done);
});

gulp.task('clean-images', function(done) {
    clean(config.dist + 'images/**/*.*', done);
});

gulp.task('clean-fonts', function(done) {
    clean(config.dist + 'images/**/*.*', done);
});

gulp.task('clean-code', function(done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.serve + '**/*.html',
        config.serve + 'js/**/*.js'
    )
    clean(files, done);
});

function clean(path, done) {
    log('Cleaning: ' + $.util.colors.blue(path));
    del(path, done);
}

gulp.task('sass-watch', function(){
    gulp.watch([config.sass], ['sass']);
});

gulp.task('serve-dev', ['inject', 'tdd'], function() {
    var isDev = true;
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT' : port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.serverFiles]
    }

    return $.nodemon(nodeOptions)
        .on('restart', function() {
            log('*** nodemon restarted');
            setTimeout(function() {
                browerSync.reload({stream: false});
            }, config.browserReloadDelay)
        })
        .on('start', function() {
            log('*** nodemon started');
            startBrowserSync();
        })
        .on('crash', function() {
            log('*** nodemon crash');
        })
        .on('exit', function() {
            log('*** nodemon exit');
        });
});

//Need to run tests
gulp.task('test', function() {
    // karma.start({
    //     configFile: __dirname + paths.karmaCfg,
    //     browsers: ['PhantomJS'],
    //     singleRun: true
    // })
});

gulp.task('tdd', function() {
    // karma.start({
    //     configFile: __dirname + paths.karmaCfg,
    //     browsers: ['PhantomJS']
    // });
})

function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}

function startBrowserSync() {
    if (browserSync.active) {
        return;
    }

    var options = {
        proxy: 'localhost:' + port,
        port: port,
        files: [
            config.d3machine + '**/*.*',
            '!' + config.sass,
            config.css
        ],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 1000

    }
    browserSync(options);
}