var map = L.map('map').setView([57.7, 11.95], 15),
    featureLayer = L.geoJson(undefined, {
        pointToLayer: function(f, latLng) {
            return L.circleMarker(latLng, {
                    radius: 4,
                    opacity: 1,
                    fillOpacity: 0.5
                })
                .bindPopup('<li><span class="maki-icon ' + f.properties.maki + '"></span>' + f.properties.name + '</li>');
        }
    }).addTo(map);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var pois = L.tileLayer.underneath('http://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
            '{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibGllZG1hbiIsImEiOiJjaWtjYjh5cGcwMDNhdm5sdmoycmgzY3drIn0.CZCSz1N53qWOVB0j2A_5pg', {
                layers: ['poi_label'],
                lazy: true
            })
    .addTo(map);

map.on('click', function(e) {
    var results = [],
        content = '<h2>Nearby</h2> <ul>',
        showResults = function(results) {
            featureLayer.addData(results);
            for (var i = 0; i < results.length; i++) {
                var f = results[i],
                    c = f.geometry.coordinates;
                content += '<li><span class="maki-icon ' +
                    f.properties.maki + '"></span>' +
                    f.properties.name +
                    '</li>';
            }

            content += '</ul>';

            L.popup()
                .setLatLng(e.latlng)
                .setContent(content)
                .openOn(map);
        };

    featureLayer.clearLayers();
    pois.query(e.latlng, function(err, results) {
        if (results.length > 0) {
            results = results.splice(0, 5);
            showResults(results);
        }
    }, null, 50);
});

L.popup()
    .setLatLng(map.getCenter())
    .setContent('<h2>Leaflet Underneath</h2>Click the map to find features near that location!')
    .openOn(map);
