var Protobuf = require('pbf'),
    VectorTile = require('vector-tile').VectorTile,
    L = require('leaflet'),
    corslite = require('corslite'),
    rbush = require('rbush');

module.exports = L.TileLayer.Underneath = L.TileLayer.extend({
    options: {
        layers: [],
        defaultTolerance: 100,
        isDuplicate: function(f, context) {
            var osmId = f.properties.osm_id,
                name = f.properties.name,
                isDupe = context[osmId] || context[name];

            if (!isDupe) {
                context[osmId] = true;
                context[name] = true;
            }

            return isDupe;
        },
        lazy: true
    },

    initialize: function(tileUrl, options) {
        L.TileLayer.prototype.initialize.call(this, tileUrl, options);
        this._bush = rbush(this.options.rbushMaxEntries);
    },

    query: function(latLng, tolerance, cb, context) {
        if (!this._map) return;

        tolerance = tolerance || this.options.defaultTolerance;

        var p = this._map.project(latLng);

        if (this.options.lazy) {
            this._loadTiles(p, tolerance, L.bind(function(err) {
                if (err) {
                    return cb(err);
                }
                this._query(p, tolerance, cb, context);
            }, this));
            return this;
        }

        this._query(p, tolerance, cb, context);
        return this;
    },

    _query: function(p, tolerance, cb, context) {
        var sqDistToP = function(s) {
                var dx = s[0] - p.x,
                    dy = s[1] - p.y;
                return dx * dx + dy * dy;
            },
            halfT = tolerance / 2,
            search = this._bush.search([p.x - halfT, p.y - halfT, p.x + halfT, p.y + halfT]),
            results = [],
            context = {},
            isDuplicate = this.options.isDuplicate,
            i,
            f;

        search.sort(function(a, b) { return sqDistToP(a) - sqDistToP(b); });

        for (i = 0; i < search.length; i++) {
            f = search[i][4];
            if (!isDuplicate(f, context)) {
                results.push(f);
            }
        }

        cb.call(context, null, results);
    },

    _loadTiles: function(p, tolerance, cb) {
        var halfT = tolerance / 2,
            se = p.add([halfT, halfT]),
            nw = p.subtract([halfT, halfT]),
            tileBounds = L.bounds(
                nw.divideBy(this.options.tileSize)._floor(),
                se.divideBy(this.options.tileSize)._floor());

        this._forceLoadTiles = true;
        this._addTilesFromCenterOut(tileBounds);
        this._forceLoadTiles = false;

        if (this._tilesToLoad) {
            this.once('load', function() { cb(); });
        } else {
            cb();
        }
    },

    _addTile: function(tilePoint, fragment, cb) {
        var key = this._tileKey(tilePoint),
            tile = { datum: null, processed: false };

        if (!this._tiles[key] && (!this.options.lazy || this._forceLoadTiles)) {
            this._tiles[key] = tile;
            return this._loadTile(tile, tilePoint, cb);
        } else {
            this._tileLoaded();
            return cb && cb();
        }
    },

    _tileKey: function(tilePoint) {
        return tilePoint.x + ':' + tilePoint.y;
    },

    _loadTile: function(tile, tilePoint, cb) {
        var url,
            request;

        this._adjustTilePoint(tilePoint);
        url = this.getTileUrl(tilePoint);
        request = corslite(url, L.bind(function(err, data) {
            if (err) {
                this.fire('tileerror', {
                    tilePoint: tilePoint,
                    url: url,
                    error: err
                });
                this._tileLoaded();
                return cb && cb(err);
            }

            this._parseTile(tile, tilePoint, new Uint8Array(data.response));
            this._tileLoaded();
            return cb && cb();
        }, this), true);
        request.responseType = 'arraybuffer';
    },

    _reset: function() {
        L.TileLayer.prototype._reset.call(this);
        this._bush.clear();
        this.fire('featurescleared');
    },

    _parseTile: function(tile, tilePoint, data) {
        var x = tilePoint.x,
            y = tilePoint.y,
            z = tilePoint.z,
            vectorTile = new VectorTile(new Protobuf(data)),
            i,
            layerName,
            layer;

        tile.processed = true;

        for (i = 0; i < this.options.layers.length; i++) {
            layerName = this.options.layers[i];
            layer = vectorTile.layers[layerName];
            if (layer) {
                this._handleLayer(layer, x, y, z);
            }
        }
    },

    _handleLayer: function(layer, x, y, z) {
        var filter = this.options.filter,
            j,
            f;

        for (j = 0; j < layer.length; j++) {
            f = layer.feature(j);
            if (!filter || filter(f)) {
                this._handleFeature(f.toGeoJSON(x, y, z));
            }
        }
    },

    _handleFeature: function(geojson) {
        var p;

        if (geojson.geometry.type !== 'Point') {
            this.fire('featureerror', {
                error: 'Feature does not have a point geometry',
                feature: f
            });
            return;
        }
        p = this._map.project([geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]]);
        this._bush.insert([p.x, p.y, p.x, p.y, geojson]);
        this.fire('featureadded', {
            feature: geojson
        });
    }
});

