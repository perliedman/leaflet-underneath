#!/bin/sh

mkdir -p dist/
browserify -t browserify-shim src/index.js -o dist/leaflet-underneath-src.js
uglifyjs dist/leaflet-underneath-src.js >dist/leaflet-underneath.js
