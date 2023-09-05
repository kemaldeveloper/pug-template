import gulp from "gulp";
import dartSass from "sass";
import gulpSass from "gulp-sass";
import browsersync from "browser-sync";
import cleancss from "gulp-clean-css";
import autoprefixer from "gulp-autoprefixer";
import notify from "gulp-notify";
import sourcemaps from "gulp-sourcemaps";
import concat from "gulp-concat";
import uglify from "gulp-uglify";
import rename from "gulp-rename";
import { deleteAsync } from "del";
import * as dotenv from "dotenv";
import tinypng from "gulp-tinypng";

// Pug
import plumber from "gulp-plumber";
import pug from "gulp-pug";
import pugbem from "gulp-pugbem";
import prettyHtml from "gulp-pretty-html";

// SVG sprite
import svgstore from "gulp-svgstore";
import svgmin from "gulp-svgmin";
import cheerio from "gulp-cheerio";
import path from "path";
import webpack from "webpack";
import webpackStream from "webpack-stream";
import { getWebpackConfig } from "./webpack.config.js";

const config = dotenv.config();
const sass = gulpSass(dartSass);
const { watch, src, dest, parallel, series } = gulp;

const jsLibsPaths = ["node_modules/jquery/dist/jquery.min.js", "node_modules/magnific-popup/dist/jquery.magnific-popup.min.js"];

function jsLibs() {
  return src(jsLibsPaths).pipe(concat("libs.min.js")).pipe(uglify()).pipe(dest("app/js")).pipe(browsersync.stream());
}

function js() {
  return src("./app/js/**/*.js")
    .pipe(webpackStream(getWebpackConfig({ mode: "development" }), webpack))
    .on("error", function (error) {
      this.emit("end");
    })
    .pipe(dest("./app/js/"))
    .pipe(browsersync.stream());
}

function minJs() {
  return src("./app/js/**/*.js")
    .pipe(webpackStream(getWebpackConfig({ mode: "production" }), webpack))
    .on("error", function (error) {
      this.emit("end");
    })
    .pipe(uglify())
    .pipe(dest("./app/js/"));
}

// main sass
function css() {
  return src("app/sass/main.sass")
    .pipe(sourcemaps.init())
    .pipe(sass.sync({ outputStyle: "compressed" }).on("error", notify.onError()))
    .pipe(autoprefixer(["last 10 versions"]))
    .pipe(cleancss({ level: { 1: { specialComments: 0 } } }))
    .pipe(rename({ extname: ".min.css" }))
    .pipe(sourcemaps.write("."))
    .pipe(dest("app/css"))
    .pipe(browsersync.stream());
}

function compressImages() {
  src("app/img/**/*.{png,jpg,jpeg,webp}").pipe(tinypng(process.env.TINYPNG_API_KEY)).pipe(gulp.dest("app/img/")).pipe(deleteAsync(".gulp"));
}

// PUG + bem
pugbem.b = true;

function html() {
  return src("app/pug/pages/*.pug")
    .pipe(plumber({ errorHandler: notify.onError() }))
    .pipe(pug({ plugins: [pugbem] }))
    .pipe(
      prettyHtml({
        indent_size: 2,
        indent_width_tabs: true,
        unformatted: ["code", "pre", "em", "strong", "span", "i", "b", "br"],
        extra_liners: [],
      }),
    )
    .pipe(dest("app/"))
    .pipe(browsersync.stream());
}

// Browser sync
function browserSync(cb) {
  browsersync.init({
    server: {
      baseDir: "app",
    },
    notify: false,
    open: false,
  });
  cb();
}

// SVG sprite
function svgSprite() {
  return src("app/img/svg-sprite/*.svg")
    .pipe(
      svgmin(function (file) {
        var prefix = path.basename(file.relative, path.extname(file.relative));
        return {
          plugins: [
            {
              cleanupIDs: {
                prefix: prefix + "-",
                minify: true,
              },
            },
          ],
        };
      }),
    )
    .pipe(
      cheerio({
        run: function ($) {
          $("[fill]").removeAttr("fill");
          $("[fill-opacity]").removeAttr("fill-opacity");
          $("[stroke]").removeAttr("stroke");
          $("[style]").removeAttr("style");
          $("[data-name]").removeAttr("data-name");
        },
        parserOptions: { xmlMode: true },
      }),
    )
    .pipe(svgstore())
    .pipe(dest("app/img/"));
}

function buildCopy() {
  return src(
    [
      "app/css/main.min.css",
      "app/js/*.{js,json}",
      "!app/js/main.js",
      "app/js/main.bundle.js",
      // 'app/js/workers.js',
      "app/fonts/**/*",
      "app/img/**/*",
      "app/*.html",
      "app/.htaccess",
      "app/mail/*",
    ],
    {
      base: "app/",
    },
  ).pipe(dest("build"));
}

async function cleanBuild() {
  await deleteAsync("build/**/*", { force: true });
}

// watch files
function startWatch() {
  watch(["app/sass/**/*.sass", "!app/sass/libs/libs.sass"], { usePolling: true }, css);
  watch("app/pug/**/*.pug", { usePolling: true }, html);
  watch(["app/js/main.js", "app/js/modules/*.js"], { usePolling: true }, js);
  watch("app/img/svg-sprite/*.svg", { usePolling: true }, svgSprite);
}

// Export tasks
export const compress = series(compressImages);
export const build = series(cleanBuild, jsLibs, minJs, css, html, buildCopy, svgSprite);
export default series(jsLibs, js, css, html, svgSprite, parallel(browserSync, startWatch));
