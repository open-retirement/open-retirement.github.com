/*
* throttle Utility function (borrowed from underscore)
*/
function throttle (func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function () {
    previous = options.leading === false ? 0 : new Date().getTime();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function () {
    var now = new Date().getTime();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};

var map = L.map('map').setView([41.907477, -87.685913], 10);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var barChartData = {
  labels : ["Q1 Score", "Q2 Score", "Q3 Score"],
  datasets : [
    {
      fillColor : "#000000",
      strokeColor : "#000000",
      highlightFill: "#000000",
      highlightStroke: "#000000",
      data : [0,0,0]
    },
  ]
};
var ctx = document.getElementById("canvas").getContext("2d");
var ctx_bar = new Chart(ctx).Bar(barChartData, {
  responsive : true,
  scaleOverride : true,
  scaleSteps : 4,
  scaleStepWidth : 25,
  scaleStartValue : 0
});

function onEachFeature(feature, layer) {
  layer.bindPopup("<b>Q1 Score:</b> " + feature.properties.q1_score + "<br>" +
                  "<b>Q2 Score:</b> " + feature.properties.q2_score + "<br>" +
                  "<b>Q3 Score:</b> " + feature.properties.q3_score);
}

function medicare_locations(lonlat) {
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
          ctx_bar.removeData();
          ctx_bar.destroy();
          ctx_bar = new Chart(ctx).Bar(barChartData, {
            responsive : true,
            scaleOverride : true,
            scaleSteps : 4,
            scaleStepWidth : 25,
            scaleStartValue : 0
          });
      }
  });
}

var API_RATE_LIMIT = 500;
var inputElement = document.getElementById("addr-search");

var mapzen_key = "search-F2Xk0nk";
var auto_url = 'https://search.mapzen.com/v1/autocomplete';
var search_url = 'https://search.mapzen.com/v1/search';

var addresses = [];

var addr_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.whitespace,
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: addresses
});

$('.typeahead').typeahead(null,
{
  name: 'addresses',
  source: addr_matches
  //display: function(addr) {return addr.properties.label }
});

function searchAddress(submitAddr) {
  var params = {
    api_key: mapzen_key,
    "focus.point.lon": -87.63,
    "focus.point.lat": 41.88,
    text: inputElement.value
  };
  // if optional argument supplied, call search endpoint
  if (submitAddr === true) {
    callMapzen(search_url, params);
  }
  else if (inputElement.value.length > 0) {
    callMapzen(auto_url, params);
  }
};

function callMapzen(url, search_params) {
  $.ajax({
    url: url,
    data: search_params,
    dataType: "json",
    success: function(data) {
      if (url === auto_url && data.features.length > 0) {
        addr_matches.clear();
        addr_matches.add(data.features.map(function(addr) {return addr.properties.label}));
      }
      else if (url === search_url) {
        if (data && data.features) {
          map.setView([data.features[0].geometry.coordinates[1], data.features[0].geometry.coordinates[0]], 12);
          var marker = L.marker([data.features[0].geometry.coordinates[1], data.features[0].geometry.coordinates[0]]).addTo(map);
        }
      }
    },
    error: function(err) {
      console.log(err);
    }
  });
}

inputElement.addEventListener('keyup', throttle(searchAddress, API_RATE_LIMIT));

$('.typeahead').bind('typeahead:select', function(ev, suggestion) {
  searchAddress(true);
});

$(".typeahead").keyup(function (e) {
  if (e.keyCode == 13) {
    medicare_locations(true);
  }
});
