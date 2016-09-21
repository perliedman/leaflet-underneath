var map = L.map('map').setView([57.7, 11.95], 15),
    featureLayer = L.geoJson(undefined).addTo(map),
    loadedFeatures = L.geoJson(undefined, {
        style: {
            color: 'red',
            fillColor: 'red',
            weight: 1
        }
    }).addTo(map);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var pois = L.tileLayer.underneath('http://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
            '{z}/{x}/{y}.vector.pbf?access_token=<your-token-here>', {
                layers: ['landuse'],
                lazy: true,
                zoomIn: 0,
                joinFeatures: true
            })
    .addTo(map);

pois
    .on('featureadded', function(e) {
        loadedFeatures.addData(e.feature);
    })
    .on('featurescleared', function() {
        loadedFeatures.clearLayers();
    });

map.on('click', function(e) {
    var results = [],
        content = '<h2>Nearby</h2> <ul>',
        showResults = function(results) {
            featureLayer.addData(results);
        };

    featureLayer.clearLayers();
    pois.query(e.latlng, function(err, results) {
        if (results.length > 0) {
            results = results.splice(0, 5);
            showResults(results);
        }
    }, null, {onlyInside: true, radius: 10});
});

L.popup()
    .setLatLng(map.getCenter())
    .setContent('<h2>Leaflet Underneath</h2>Click the map to find landuse!')
    .openOn(map);
