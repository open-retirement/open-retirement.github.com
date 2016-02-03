var map = L.map('map').setView([41.907477, -87.685913], 10);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function onEachFeature(feature, layer) {
  layer.bindPopup("<b>Q1 Score:</b> " + feature.properties.q1_score + "<br>" +
                  "<b>Q2 Score:</b> " + feature.properties.q2_score + "<br>" +
                  "<b>Q3 Score:</b> " + feature.properties.q3_score);
}

$.ajax({
    url: "https://data.medicare.gov/resource/djen-97ju.json?federal_provider_number=145541&measure_code=426",
    dataType: "json",
    success: function (data) {
        test_home = data;
        var test_geo = {
          type: "Feature",
          properties: {
              name: "Test"
          },
          geometry: {
              type: "Point",
              coordinates: []
          }
        };
        test_geo.geometry.coordinates = [parseFloat(test_home[0].location.longitude), parseFloat(test_home[0].location.latitude)];
        test_geo.properties.q1_score = parseFloat(test_home[0].q1_measure_score);
        test_geo.properties.q2_score = parseFloat(test_home[0].q2_measure_score);
        test_geo.properties.q3_score = parseFloat(test_home[0].q3_measure_score);
        var home_geo = L.geoJson(test_geo, {
          onEachFeature: onEachFeature
        });
        home_geo.addTo(map);
        var barChartData = {
        	labels : ["Q1 Score", "Q2 Score", "Q3 Score"],
        	datasets : [
        		{
        			fillColor : "#000000",
        			strokeColor : "#000000",
        			highlightFill: "#000000",
        			highlightStroke: "#000000",
        			data : [test_home[0].q1_measure_score, test_home[0].q2_measure_score, test_home[0].q3_measure_score]
        		},
          ]
        };
        var ctx = document.getElementById("canvas").getContext("2d");
        var ctx_bar = new Chart(ctx).Bar(barChartData, {
          responsive : true
        });
    }
});
