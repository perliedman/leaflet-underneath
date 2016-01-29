var map = L.map('map').setView([57.7, 11.95], 15);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

new L.TileLayer.Pois('http://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
            '{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoiZG90bmV0bWVudG9yIiwiYSI6ImNpZXpwOXZ6azAwcDNzdmx0dDZqcmNkM3MifQ.FEM3zoH8orR9Pwwgr5j-5g').addTo(map);
