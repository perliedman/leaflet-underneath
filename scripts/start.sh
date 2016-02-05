#!/bin/sh

watchify -t browserify-shim src/index.js -o dist/leaflet-underneath-src.js &
http-server

