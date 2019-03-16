#!/usr/bin/env bash

set -e

rm -rf public/

mkdir -p static/build/js static/build/css

cp -r static/src/* static/build

cp node_modules/bootstrap/dist/js/bootstrap.bundle.min.js static/build/js/bootstrap.js
cp node_modules/animate.css/animate.min.css static/build/css/animate.css
cp -r node_modules/@fortawesome/fontawesome-free/css/all.min.css static/build/css/font-awesome.css
cp -r node_modules/@fortawesome/fontawesome-free/webfonts static/build

hugo -v --stepAnalysis --gc
