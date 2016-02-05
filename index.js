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

var pois = new L.TileLayer.Underneath('http://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
            '{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoiZG90bmV0bWVudG9yIiwiYSI6ImNpZXpwOXZ6azAwcDNzdmx0dDZqcmNkM3MifQ.FEM3zoH8orR9Pwwgr5j-5g', {
                layers: ['poi_label']
            })
    /*.on('featureadded', function(e) {
        featureLayer.addData(e.feature);
    })
    .on('featurescleared', function() {
        featureLayer.clearLayers();
    })*/
    .addTo(map);

map.on('click', function(e) {
    var results = [],
        tolerance = 3,
        content = 'Nearby: <ul>';

    featureLayer.clearLayers();

    while (results.length === 0 && tolerance < 100) {
        results = pois.query(e.latlng, tolerance);
        tolerance *= 2;
    }

    if (results.length > 0) {
        featureLayer.addData(results);
        for (var i = 0; i < 5 && i < results.length; i++) {
            var r = results[i],
                c = r.geometry.coordinates;
            content += '<li><span class="maki-icon ' + r.properties.maki + '"></span>' + r.properties.name + '</li>';
        }

        content += '</ul>';

        L.popup()
            .setLatLng(e.latlng)
            .setContent(content)
            .openOn(map);
    }
});
