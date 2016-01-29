#!/bin/sh

mkdir -p dist/
browserify -t browserify-shim src/index.js -o dist/mvt-pois-src.js
