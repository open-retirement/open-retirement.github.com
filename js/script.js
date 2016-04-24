L.mapbox.accessToken = 'pk.eyJ1IjoiY25ocyIsImEiOiJjaW11eXJiamwwMmprdjdra29kcW1xb2J2In0.ERYma-Q2MQtY6D02V-Fobg';

var map = L.mapbox.map('map', 'mapbox.light', {
    legendControl: {
      position: "bottomleft"
    },
    minZoom: 7
}).setView([41.907477, -87.685913], 10);

var medicareLayer = L.mapbox.featureLayer().addTo(map);
map.legendControl.addLegend(document.getElementById('legend').innerHTML);

/*
Uncomment this to disable dragging, consider for mobile
map.dragging.disable();
*/

// Custom tooltip: https://www.mapbox.com/mapbox.js/example/v1.0.0/custom-marker-tooltip/
// Add custom popups to each using our custom feature properties
medicareLayer.on('layeradd', function(e) {
    var marker = e.layer;
    var feature = marker.feature;

    // Create custom popup content
    var popupContent =  "<div class='marker-title'>" + feature.properties.title + "</div>" +
                        feature.properties.description + "<div id='chart_div'></div>";

    // http://leafletjs.com/reference.html#popup
    marker.bindPopup(popupContent,{
        closeButton: true,
        minWidth: 300,
        keepInView: true
    });
});

var markerColorArr = ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"];

// Load map with default layer of all Cook County nursing homes
$(document).ready(function() {
  var query_string = "https://data.medicare.gov/resource/4pq5-n9py.json?$where=" +
    "provider_state='IL'&provider_county_name='Cook'";
  $.ajax({
      url: query_string,
      dataType: "json",
      success: handleMedicareResponse
  });
});

// Load the Visualization API and the corechart package.
google.charts.load('current', {'packages':['corechart']});

// Create chart within tooltip
function drawChart(scores, title) {
  // Create the data table.
  var data = new google.visualization.arrayToDataTable([
    ["Measure", "Score", { role: 'style' }, { role: 'annotation' }],
    ["Overall", scores[0], markerColorArr[scores[0] - 1], "Overall"],
    ["Inspections", scores[1], markerColorArr[scores[1] - 1], "Inspections"],
    ["Staffing", scores[2], markerColorArr[scores[2] - 1], "Staffing"],
    ["Nurses", scores[3], markerColorArr[scores[3] -1], "Nurses"]
  ]);

  // Set chart options
  var options = {'width':270,
                 'height':120,
                 'legend': {position: 'none'},
                 'chartArea': {
                   'width': '80%',
                   'height': '75%',
                 },
                 'vAxis': {
                   'ticks': [0,1,2,3,4,5]
                 },
                 'annotations': {
                   'alwaysOutside': true,
                   'highContrast': false,
                   'textStyle': {
                     'fontName': 'Helvetica',
                     'fontSize': 10,
                     'bold': true,
                     'color': '#000',
                     'auraColor': 'none'
                   }
                 }};

  // Instantiate and draw our chart, passing in some options.
  var chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
  chart.draw(data, options);
}

medicareLayer.on('click', function(e) {
  var feature = e.layer.feature;
  ret_data = feature.properties.scores.map(function(score) {return parseFloat(score);});

  // Center map on the clicked marker
  map.panTo(e.layer.getLatLng());

  drawChart(ret_data, feature.properties.title);
});

// Callback for loading nursing homes from Medicare Socrata API
function handleMedicareResponse(responses) {
  var markerArray = [];
  var fac_geo_agg = responses.map(function(facility) {
    var fac_geo = {
      type: "Feature",
      properties: {},
      geometry: {
          type: "Point",
          coordinates: []
      }
    };
    // Leaving these in properties as they might be used later for filtering
    fac_geo.properties.street_addr = facility.provider_address;
    fac_geo.properties.city = facility.provider_city;
    fac_geo.properties.ownership_type = facility.ownership_type;
    fac_geo.properties.scores = [facility.overall_rating,
                                 facility.health_inspection_rating,
                                 facility.staffing_rating,
                                 facility.rn_staffing_rating];

    // Getting phone number and formatting it for tooltip
    var provider_phone = facility.provider_phone_number.phone_number;
    var phone = "(" + provider_phone.substr(0,3) + ") " + provider_phone.substr(3,3) +
                "-" + provider_phone.substr(6,4);

    fac_geo.properties.title = facility.provider_name;

    // Set marker color based off of score
    fac_geo.properties['marker-color'] = markerColorArr[facility.overall_rating - 1];

    fac_geo.properties.description = "<p><b>" + fac_geo.properties.ownership_type + "</b></p>" +
                                     "<p>" + fac_geo.properties.street_addr + ", " +
                                     fac_geo.properties.city + "</p>" +
                                     "<p>" + phone + "</p>";


    if (!isNaN(parseFloat(facility.location.longitude))) {
      fac_geo.geometry.coordinates = [parseFloat(facility.location.longitude),
                                      parseFloat(facility.location.latitude)];
      markerArray.push(fac_geo);
    }
  });
  medicareLayer.setGeoJSON(markerArray);
}

// Functions for querying by address point and neighborhood

function queryPointMedicare(latlon) {
  // Currently querying for all codes
  var query_string = "https://data.medicare.gov/resource/4pq5-n9py.json?$where=within_circle(location," +
                     latlon[1] + "," + latlon[0] + ",1500)";
  $.ajax({
      url: query_string,
      dataType: "json",
      success: handleMedicareResponse
  });
}

// Medicare search by neighborhood

function queryBoxMedicare(bbox) {
  // Currently querying for all codes
  var query_string = "https://data.medicare.gov/resource/4pq5-n9py.json?$where=within_box(location," +
                   bbox.toString() + ")";
  $.ajax({
      url: query_string,
      dataType: "json",
      success: handleMedicareResponse
  });
}

// Mapzen search functionality and details

var API_RATE_LIMIT = 1000;
var inputElement = document.getElementById("addr-search");

var mapzen_key = "search-Cq8H0_o";
var auto_url = 'https://search.mapzen.com/v1/autocomplete';
var search_url = 'https://search.mapzen.com/v1/search';

// Set up bounding boxes for zip codes

var chi_boxes = chi_zip.features.map(function(geo) {
  var geo_box = {};
  geo_box.gid = geo.properties.gid;
  geo_box.zip = geo.properties.zip;
  geo_box.coordinates = [geo.geometry.coordinates[0][1].reverse(), geo.geometry.coordinates[0][3].reverse()];
  geo_box.center = [(geo_box.coordinates[0][0] + geo_box.coordinates[1][0]) / 2, (geo_box.coordinates[0][1] + geo_box.coordinates[1][1]) / 2];
  return geo_box;
});

// Create Bloodhound objects for autocomplete for zip and address

var zip_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("zip"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: chi_boxes
});

var addr_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("name"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: []
});

$('#addr-search').typeahead({
  highlight: true
},
{
  name: 'addresses',
  displayKey: 'name',
  source: addr_matches
});

$('#zip-search').typeahead({
  highlight: true
},
{
  name: 'zips',
  displayKey: 'zip',
  source: zip_matches
});

// Determines which Mapzen endpoint to query based on parameter

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

// Call Mapzen API, handle responses

function callMapzen(url, search_params) {
  $.ajax({
    url: url,
    data: search_params,
    dataType: "json",
    success: function(data) {
      if (url === auto_url && data.features.length > 0) {
        addr_matches.clear();
        addr_matches.add(data.features.map(function(addr) {
          addr.name = addr.properties.label;
          return addr;
        }));
      }
      else if (url === search_url) {
        if (data && data.features) {
          map.setView([data.features[0].geometry.coordinates[1], data.features[0].geometry.coordinates[0]], 14);
          queryPointMedicare(data.features[0].geometry.coordinates);
        }
      }
    },
    error: function(err) {
      console.log(err);
    }
  });
}

// Create event listeners on both inputs

inputElement.addEventListener('keyup', throttle(searchAddress, API_RATE_LIMIT));

$('#addr-search').bind('typeahead:select', function(ev, data) {
  map.setView([data.geometry.coordinates[1], data.geometry.coordinates[0]], 14);
  queryPointMedicare(data.geometry.coordinates);
});

$("#addr-search").keyup(function (e) {
  if (e.keyCode == 13) {
    searchAddress(true);
  }
});

$('#zip-search').bind('typeahead:select', function(ev, data) {
  map.setView(data.center, 14);
  queryBoxMedicare(data.coordinates);
});

$("#zip-search").keyup(function (e) {
  if (e.keyCode == 13) {
    var zip_val = document.getElementById("zip-search").value;
    for (var i = 0; i < chi_boxes.length; ++i) {
      if (chi_boxes[i].zip === zip_val) {
        map.setView(chi_boxes[i].center, 14);
        queryBoxMedicare(chi_boxes[i].coordinates);
      }
    }
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
