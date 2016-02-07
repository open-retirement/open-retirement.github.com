var map = L.map('map').setView([41.907477, -87.685913], 10);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markerArray = [];

var barChartData = {
  labels : ["Q1 Score", "Q2 Score", "Q3 Score"],
  datasets : [
    {
      fillColor : "#000080",
      highlightFill: "#000080",
      data : [0,0,0]
    },
  ]
};
var ctx = document.getElementById("canvas").getContext("2d");
var barChartOptions = {
  responsive : true,
  scaleOverride : true,
  scaleSteps : 4,
  scaleStepWidth : 25,
  scaleStartValue : 0
};

var ctx_bar = new Chart(ctx).Bar(barChartData, barChartOptions);

function onEachFeature(feature, layer) {
  layer.bindPopup("<b>Facility:</b> " + feature.properties.name + "<br>" +
                  "<b>Q1 Score:</b> " + feature.properties.scores[0] + "<br>" +
                  "<b>Q2 Score:</b> " + feature.properties.scores[1] + "<br>" +
                  "<b>Q3 Score:</b> " + feature.properties.scores[2]);
  layer.on('click', function(e) {
    var facility_data = barChartData;
    test_data = feature.properties.scores.map(function(score) {return parseFloat(score);});
    facility_data.datasets[0].data = test_data;
    ctx_bar.destroy();
    ctx_bar = new Chart(ctx).Bar(facility_data, barChartOptions);
    $("#canvas-label").text(feature.properties.name);
  });
}

function medicare_locations(latlon) {
  // Currently querying for specific code, will need to broaden this out?
  var query_string = "https://data.medicare.gov/resource/djen-97ju.json?measure_code=419&$where=within_circle(location," +
                     latlon[1] + "," + latlon[0] + ",1500)";
  console.log(query_string);
  $.ajax({
      url: query_string,
      dataType: "json",
      success: function (data) {
        var fac_geo_agg = data.map(function(facility) {
          var fac_geo = {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Point",
                coordinates: []
            }
          };
          fac_geo.properties.street_addr = facility.provider_address;
          fac_geo.properties.city = facility.provider_city;
          fac_geo.properties.state = facility.provider_state;
          fac_geo.properties.scores = [facility.q1_measure_score,
                                       facility.q2_measure_score,
                                       facility.q3_measure_score];
          fac_geo.properties.name = facility.provider_name;
          fac_geo.geometry.coordinates = [parseFloat(facility.location.longitude),
                                          parseFloat(facility.location.latitude)];
          var add_fac_geo = L.geoJson(fac_geo, {
            onEachFeature: onEachFeature
          });
          add_fac_geo.addTo(map);
          markerArray.push(add_fac_geo);
        });
      }
  });
}

var API_RATE_LIMIT = 1000;
var inputElement = document.getElementById("addr-search");

var mapzen_key = "search-Cq8H0_o";
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
}

function callMapzen(url, search_params) {
  $.ajax({
    url: url,
    data: search_params,
    dataType: "json",
    success: function(data) {
      if (url === auto_url && data.features.length > 0) {
        addr_matches.clear();
        addr_matches.add(data.features.map(function(addr) {return addr.properties.label;}));
      }
      else if (url === search_url) {
        if (data && data.features) {
          map.setView([data.features[0].geometry.coordinates[1], data.features[0].geometry.coordinates[0]], 14);
          medicare_locations(data.features[0].geometry.coordinates);
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
    searchAddress(true);
  }
});

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
}
