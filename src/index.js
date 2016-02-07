var Protobuf = require('pbf'),
    VectorTile = require('vector-tile').VectorTile,
    L = require('leaflet'),
    corslite = require('corslite'),
    rbush = require('rbush');

module.exports = L.TileLayer.Underneath = L.TileLayer.extend({
    options: {
        layers: [],
        defaultRadius: 20,
        featureId: function(f) {
            return f.properties.osm_id;
        },
        lazy: true
    },

    initialize: function(tileUrl, options) {
        L.TileLayer.prototype.initialize.call(this, tileUrl, options);
        this._bush = rbush(this.options.rbushMaxEntries);
    },

    query: function(latLng, cb, context, radius) {
        if (!this._map) return;

        radius = radius || this.options.defaultradius;

        var p = this._map.project(latLng);

        if (this.options.lazy) {
            this._loadTiles(p, radius, L.bind(function(err) {
                if (err) {
                    return cb(err);
                }
                this._query(p, radius, cb, context);
            }, this));
            return this;
        }

        this._query(p, radius, cb, context);
        return this;
    },

    _query: function(p, radius, cb, context) {
        var sqDistToP = function(s) {
                var dx = s[0] - p.x,
                    dy = s[1] - p.y;
                return dx * dx + dy * dy;
            },
            sqTol = radius * radius,
            search = this._bush.search([p.x - radius, p.y - radius, p.x + radius, p.y + radius]),
            results = [],
            i;

        search.sort(function(a, b) { return sqDistToP(a) - sqDistToP(b); });

        for (i = 0; i < search.length; i++) {
            if (sqDistToP(search[i]) < sqTol) {
                results.push(search[i][4]);
            }
        }

        cb.call(context, null, results);
    },

    _loadTiles: function(p, radius, cb) {
        var se = p.add([radius, radius]),
            nw = p.subtract([radius, radius]),
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
        this._features = {};
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
            f,
            id;

        for (j = 0; j < layer.length; j++) {
            f = layer.feature(j);
            if (!filter || filter(f)) {
                id = this.options.featureId(f);
                if (!this._features[id]) {
                    this._features[id] = true;
                    this._handleFeature(f.toGeoJSON(x, y, z));
                }
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

L.tileLayer.underneath = function(tileUrl, options) {
    return new L.TileLayer.Underneath(tileUrl, options);
};
