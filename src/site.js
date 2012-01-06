var m;

$(function() {

    // Cluster overlapping markers
    function cluster(input) {
        
        var d = JSON.parse(JSON.stringify(input));
        
        $('.marker').removeClass('highlight');

        function locate(feature) {
            // GeoJSON
            var geom = feature.geometry;
            // coerce the lat and lon values, just in case
            var lon = Number(geom.coordinates[0]),
                lat = Number(geom.coordinates[1]);
            return new MM.Location(lat, lon);
        }
        
        function point(l) {
            return m.locationPoint(l);
        }
        
        // loop through each feature
        for (var i = 0; i < d.features.length; i++) {
            
            // check distance from every other feature
            for (var n = 0; n < d.features.length; n++) {
                
                // Make sure this is not the same marker
                if(i !== n) {
                
                    // Calculate minimum allow distance
                    var c1 = point(locate(d.features[i])),
                        p1 = new MM.Point(
                            c1.x,
                            c1.y - d.features[i].properties.score / 2
                        ),
                        r1 = MM.Point.distance(c1, p1),
                        c2 = point(locate(d.features[n])),
                        p2 = new MM.Point(
                            c2.x,
                            c2.y - d.features[n].properties.score / 2
                        ),
                        r2 = MM.Point.distance(c2, p2),
                        minDist = r1 + r2,

                        // Calculate distance
                        dist = MM.Point.distance(
                            point(locate(d.features[i])), 
                            point(locate(d.features[n]))
                        );
                    
                    // Handle overlapping markers
                    if (dist < minDist) {
                    
                        // number of overlapped marker
                        var t = (d.features[i].total || 1) + (d.features[n].total || 1);
                        d.features[i] = _.extend(d.features[i], {total: t});
                    
                        // total score
                        d.features[i].properties.score = (d.features[i].properties.score
                            + d.features[n].properties.score);
                        if (d.features[i].properties.score > 100) d.features[i].properties.score = 100;
                        
                        // calculate new center for marker
                        var weight = (r2) / (r1 + r2),
                            pt = new MM.Point(
                                (c1.x + weight * (c2.x - c1.x)),
                                (c1.y + weight * (c2.y - c1.y))
                            ),
                            loc = m.pointLocation(pt);
                        
                        // apply new center to marker
                        d.features[i].geometry.coordinates[0] = Number(loc.lon);
                        d.features[i].geometry.coordinates[1] = Number(loc.lat);                        
                        
                        // remove overlapping marker
                        d.features[n] = null;
                        d.features = _.compact(d.features);
                    
                        // reset loop
                        i = 0;
                    }
                }
            }
        }
        return d;
    }
    
    // request tilejson for map
    wax.tilejson('http://a.tiles.mapbox.com/v3/mapbox.world-bright.jsonp', function(tj) {
        
        // make map
        m = new MM.Map('map', new wax.mm.connector(tj))
            .setCenterZoom(new MM.Location(0, 0), 1);
                
        // add a layer of HTML markers to the map
        var geojsonLayer = function(){ return mmg().factory(function(d){
            var e = document.createElement('div');
            
            // set the size of each marker by the score value
            e.style.cssText = 'width: ' 
                + (d.properties.score - 2) + 'px; height: ' 
                + (d.properties.score - 2) + 'px; -moz-border-radius: ' 
                + d.properties.score + 'px; -webkit-border-radius: ' 
                + d.properties.score + 'px; border-radius: ' 
                + d.properties.score + 'px; line-height: ' 
                + d.properties.score + 'px; margin-left: '
                + -(d.properties.score / 2) + 'px; margin-top: '
                + -(d.properties.score / 2) + 'px;';
                    
            // set the marker's class and id
            e.className = 'marker';
            if (d.total) e.className += ' highlight';
            
            e.id = d.properties.name;
            
            e.innerHTML = d.total || '';
    
            return e;
        }).geojson(cluster(geodata))};
        
        m.addLayer(geojsonLayer());
        
        m.addCallback('zoomed', function(){
            $('.geojson').remove();
            m.addLayer(geojsonLayer());
        });
    });
});