#!/bin/sh

watchify -t browserify-shim src/index.js -o dist/mvt-pois-src.js &
http-server

