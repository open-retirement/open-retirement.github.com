L.mapbox.accessToken = 'pk.eyJ1IjoiY25ocyIsImEiOiJjaW11eXJiamwwMmprdjdra29kcW1xb2J2In0.ERYma-Q2MQtY6D02V-Fobg';

var map = L.mapbox.map('map', 'mapbox.light', {
    legendControl: {
      position: "bottomleft"
    }
}).setView([41.907477, -87.685913], 10);
var medicareLayer = L.mapbox.featureLayer().addTo(map);
map.legendControl.addLegend(document.getElementById('legend').innerHTML);

// Custom tooltip: https://www.mapbox.com/mapbox.js/example/v1.0.0/custom-marker-tooltip/
// Add custom popups to each using our custom feature properties
medicareLayer.on('layeradd', function(e) {
    var marker = e.layer;
    var feature = marker.feature;

    // Create custom popup content
    /*
    var popupContent =  "<div class='marker-title'>" + feature.properties.title + "</div>" +
                        "<div id='chart_div'></div>" +
                        feature.properties.description;*/
    var popupContent =  "<div id='chart_div'></div>" + feature.properties.description;

    // http://leafletjs.com/reference.html#popup
    marker.bindPopup(popupContent,{
        closeButton: true,
        minWidth: 320
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

// Set a callback to run when the Google Visualization API is loaded.
google.charts.setOnLoadCallback(function() {
  console.log("Google Charts loaded!");
});

// Callback that creates and populates a data table,
// instantiates the pie chart, passes in the data and
// draws it.
function drawChart(scores, title) {
  // Create the data table.
  var data = new google.visualization.arrayToDataTable([
    ["Measure", "Score", { role: 'style' }],
    ["Overall", scores[0], markerColorArr[scores[0] - 1]],
    ["Inspections", scores[1], markerColorArr[scores[1] - 1]],
    ["Staffing", scores[2], markerColorArr[scores[2] - 1]],
    ["Nurses", scores[3], markerColorArr[scores[3] -1]]
  ]);

  // Set chart options
  var options = {'title': title,
                 'width':300,
                 'height':150};

  // Instantiate and draw our chart, passing in some options.
  var chart = new google.visualization.BarChart(document.getElementById('chart_div'));
  chart.draw(data, options);
}

/*
// Create empty, default bar chart
var barChartData = {
  labels : ["Overall", "Inspections", "Staffing", "Nurses"],
  datasets : [
    {
      fillColor : "#000080",
      highlightFill: "#000080",
      data : [0,0,0,0]
    },
  ]
};

var barChartOptions = {
  responsive : true,
  scaleOverride : true,
  scaleIntegersOnly: true,
  scaleSteps: 5,
  scaleStepWidth: 1,
  scaleStartValue: 0
};
*/

medicareLayer.on('click', function(e) {
  //var facility_data = barChartData;
  var feature = e.layer.feature;
  ret_data = feature.properties.scores.map(function(score) {return parseFloat(score);});
  //facility_data.datasets[0].data = ret_data;

  // Center map on the clicked marker
  map.panTo(e.layer.getLatLng());

  /*
  // Check if bar exists, if so, destroy
  if (ctx_bar) {
    ctx_bar.destroy();
  }
  var ctx = document.getElementById("canvas").getContext("2d");
  var ctx_bar = new Chart(ctx).Bar(facility_data, barChartOptions);
  */
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
    fac_geo.properties.state = facility.provider_state;
    fac_geo.properties.ownership_type = facility.ownership_type;
    fac_geo.properties.scores = [facility.overall_rating,
                                 facility.health_inspection_rating,
                                 facility.staffing_rating,
                                 facility.rn_staffing_rating];

    // Getting phone number and formatting it for tooltip
    var provider_phone = facility.provider_phone_number.phone_number;
    var phone = provider_phone.substr(0,3) + "-" + provider_phone.substr(3,3) + "-" + provider_phone.substr(6,4);

    fac_geo.properties.title = facility.provider_name;
    // Set marker color based off of score
    fac_geo.properties['marker-color'] = markerColorArr[facility.overall_rating - 1];
    /*
    fac_geo.properties.description = "<b>Ownership:</b> " + facility.ownership_type + "<br>" +
                                     "<b>Phone Number:</b> " + phone + "<br>" +
                                     "<b>Overall:</b> " + facility.overall_rating + "<br>" +
                                     "<b>Health Inspection:</b> " + facility.health_inspection_rating + "<br>" +
                                     "<b>Staffing:</b> " + facility.staffing_rating + "<br>" +
                                     "<b>RN Staffing:</b> " + facility.rn_staffing_rating; */

    fac_geo.properties.description = "<b>Phone Number:</b> " + phone + "<br>";
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

/* Medicare search by neighborhood */

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
