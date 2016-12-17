var map;
var medicareLayer;
var allProviders = [];

// Mapzen search functionality and details
var inputElement = document.getElementById("addr-search");
var mapzen_key = "search-Cq8H0_o";
var auto_url = 'https://search.mapzen.com/v1/autocomplete';
var search_url = 'https://search.mapzen.com/v1/search';
L.mapbox.accessToken = 'pk.eyJ1IjoiY25ocyIsImEiOiJjaW11eXJiamwwMmprdjdra29kcW1xb2J2In0.ERYma-Q2MQtY6D02V-Fobg';

var match_providers = [];

var full_auto_url = auto_url + "?api_key=" + mapzen_key + "&focus.point.lon=-87.63&focus.point.lat=41.88&text=";

var readScore;
var overall_mapping;
var markerColorArr;
var punctuatePhone;

// Create Bloodhound objects for autocomplete
var addr_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("label"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  remote: {
      url: full_auto_url,
      rateLimitBy: "throttle",
      rateLimitWait: 1000,
      replace: function() {
        var val = inputElement.value;
        var processed_url = full_auto_url + encodeURIComponent(val);
        return processed_url;
      },
      transform: function(response) {
        response.features.map(function(addr) {
            addr.label = addr.properties.label;
            addr.category = "address";
            return addr;
          });
        //return chi_boxes.concat(match_providers, response.features);
        return response.features;
      }
    }
});

var zip_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("zip"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: []
});

// Leave empty, data will be pulled from initial Socrata query
var provider_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("label"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: []
});

addr_matches.initialize();
zip_matches.initialize();
provider_matches.initialize();

// Execute on page load
(function(){
  map = L.mapbox.map('map', 'mapbox.light', {
      legendControl: {
        position: "bottomleft"
      },
      minZoom: 7
  }).setView([41.907477, -87.685913], 10);

  medicareLayer = L.mapbox.featureLayer().addTo(map);
  map.legendControl.addLegend(document.getElementById('legend').innerHTML);

  // Disable dragging on mobile, allow for scroll over map
  if (document.documentElement.clientWidth < 780) {
    map.dragging.disable();
    if (map.tap) map.tap.disable();
    // Make sure that mobile native scrolling on select disabled
    $('input.typeahead').bind('focusin focus', function(e){
      e.preventDefault();
    });
  }

  // Custom tooltip: https://www.mapbox.com/mapbox.js/example/v1.0.0/custom-marker-tooltip/
  // Add custom popups to each using our custom feature properties
  medicareLayer.on('layeradd', function(e) {
      var marker = e.layer;
      var feature = marker.feature;

      // Create custom popup content
      var popupContent =  "<div class='marker-title'><a href='/detail?" +
                          feature.properties.federal_provider_number + "'>" +
                          feature.properties.title + "</a></div>" +
                          feature.properties.description;

      // http://leafletjs.com/reference.html#popup
      marker.bindPopup(popupContent,{
          closeButton: true,
          className: "popup-window",
          keepInView: true
      });
  });

  medicareLayer.on('click', function(e) {
    var feature = e.layer.feature;
    ret_data = feature.properties.scores.map(function(score) {return parseFloat(score);});

    // Center map on the clicked marker
    map.panTo(e.layer.getLatLng());
  });

  // Load initial data
  $.ajax({
      url: "https://data.medicare.gov/resource/b27b-2uc7.json?$where=" +
           "provider_county_name in('Cook','Lake','Will','Du Page','Kane'," +
           "'McHenry')&provider_state='IL'",
      dataType: "json",
      success: handleMedicareResponse
  });

  // Search DOM manipulation
  $('#addr-search').typeahead({
    highlight: true,
    hint: false,
    minLength: 3
  },
  {
    name: 'zips',
    display: 'zip',
    source: zip_matches
  },
  {
    name: 'providers',
    display: 'label',
    source: provider_matches
  },
  {
    name: 'addresses',
    display: 'label',
    source: addr_matches
  }
  );

  // Create event listeners on both inputs
  //inputElement.addEventListener('keyup', throttle(searchAddress, API_RATE_LIMIT));

  $('#addr-search').bind('typeahead:select', function(ev, data) {
    if (data.category === "address") {
      map.setView([data.geometry.coordinates[1],
                   data.geometry.coordinates[0]], 14);
      locationQuery(data.geometry.coordinates);
    }
    else if (data.category === "zip") {
      var providersWithZip = allProviders.filter(function(p) {
        return p.properties.zip === data.zip;
      });
      medicareLayer.setGeoJSON(providersWithZip);
      map.fitBounds(medicareLayer.getBounds());
    }
    else if (data.category === "provider") {
      medicareLayer.setGeoJSON([data]);
      map.setView(data.geometry.coordinates.reverse(), 14);
    }

    screenReturnToTop();
  });

  // add a listener on the search button
  var searchButton = document.getElementById("search");
  searchButton.addEventListener("click", function(e) {
    searchQuery();
  });

  // add another listener on the return key for searching
  var searchBox = document.getElementById("addr-search");
  var clearButton = document.getElementById("clearButton");
  var clearTD = document.getElementById("clearTD");

  searchBox.addEventListener("keyup", function(e) {
    if (e.keyCode === 13) {
      searchQuery();
    }
    // show clear button
    if (hasClass(clearTD, 'hidden')) {
      removeClass(clearTD, 'hidden');
    }
  });

  // listen for click on clear button
  clearButton.addEventListener("click", function(e) {
    // clear the value in the search box
    searchBox.value = '';

    console.log(addr_matches);

    // reset the data and map
    map.setView([41.907477, -87.685913], 10);
    locationQuery([]);

    // hide clear button
    addClass(clearTD, 'hidden');


  });


})()

function searchQuery() {
  // Check if value is zip code, if so search against that
  if (inputElement.value.match('[0-9]{5}')) {
    zip_val = inputElement.value;
    var providersWithZip = allProviders.filter(function(p) {
      return p.properties.zip === zip_val;
    });
    if (providersWithZip.length) {
      medicareLayer.setGeoJSON(providersWithZip);
      map.fitBounds(medicareLayer.getBounds());
    }
  }
  else {
    callMapzen();
  }
  screenReturnToTop();
}

// Callback for loading nursing homes from Medicare Socrata API
function handleMedicareResponse(responses) {
  var fac_geo_agg = responses.map(function(facility) {
    var fac_geo = {
      type: "Feature",
      properties: {},
      geometry: {
          type: "Point",
          coordinates: []
      }
    };

    fac_geo.properties.street_addr = facility.provider_address;
    fac_geo.properties.zip = facility.provider_zip_code;
    fac_geo.properties.federal_provider_number = facility.federal_provider_number;
    fac_geo.properties.city = facility.provider_city;
    fac_geo.properties.ownership_type = facility.ownership_type;
    fac_geo.properties.scores = [facility.overall_rating,
                                 facility.health_inspection_rating,
                                 facility.staffing_rating,
                                 facility.rn_staffing_rating];

    for (var i = 0; i < fac_geo.properties.scores.length; ++i) {
      if (fac_geo.properties.scores[i] === undefined || fac_geo.properties.scores[i] === null) {
        fac_geo.properties.scores[i] = "N/A";
      }
    }

    // Getting phone number and formatting it for tooltip
    var provider_phone = facility.provider_phone_number;
    //var provider_phone = facility.provider_phone_number.toString();
    var phone = "(" + provider_phone.substr(0,3) + ") " + provider_phone.substr(3,3) +
                "-" + provider_phone.substr(6,4);

    fac_geo.properties.title = facility.provider_name;

    // Set marker color based off of score
    fac_geo.properties['marker-color'] = markerColorArr[facility.overall_rating - 1];

    fac_geo.properties.description = "<div>" +
                                     "<ul><li>" + fac_geo.properties.street_addr + ", " +
                                     fac_geo.properties.city + "</li>" +
                                     "<li>" + phone + "</li>" +
                                     "<li>" + fac_geo.properties.ownership_type +
                                     "</li></ul></div>" +
                                     "<div class='popup-left'>" +
                                     "<div class='fac_geo_overall'>Rating: <span class='rating_number rating-" +
                                     fac_geo.properties.scores[0] +
                                     "'>" + fac_geo.properties.scores[0] + "</span></div>" +
                                     "</div>" +
                                     "<div class='popup-right'><table class='fac_geo_breakdown'>" +
                                     "<tr><td class='popup-field'>Inspections</td><td class='popup-stars'>" +
                                     readScore(fac_geo.properties.scores[1]) + "</td></tr>" +
                                     "<tr><td class='popup-field'>Staffing</td><td class='popup-stars'>" +
                                     readScore(fac_geo.properties.scores[2]) + "</td></tr>" +
                                     "<tr><td class='popup-field'>Nurses</td><td class='popup-stars'>" +
                                     readScore(fac_geo.properties.scores[3]) + "</td></tr>" +
                                     "</table></div><p style='clear:both;'></p>";


    if (facility.location) {
      fac_geo.geometry.coordinates = [parseFloat(facility.location.coordinates[0]),
                                      parseFloat(facility.location.coordinates[1])];
      allProviders.push(fac_geo);
    }

    // Below necessary if static JSON file is used for providers
    /*
    if (!isNaN(parseFloat(facility.longitude)) && !isNaN(parseFloat(facility.latitude))) {
      fac_geo.geometry.coordinates = [parseFloat(facility.longitude),
                                      parseFloat(facility.latitude)];
      allProviders.push(fac_geo);
    }*/
  });
  medicareLayer.setGeoJSON(allProviders);

  // Create array with title added (for Bloodhound)
  // Add item as single point to GeoJSON layer in callback
  match_providers = allProviders.map(function(p) {
    p.label = p.properties.title;
    p.category = "provider";
    return p;
  });

  // Get zips in array to establish unique, then make into object for search
  match_zips = allProviders.map(function(p) {
    return p.properties.zip;
  }).filter(function(item, i, ar) { return ar.indexOf(item) === i;
  }).map(function(z) { return {zip: z, category: "zip"}; });

  zip_matches.add(match_zips);
  provider_matches.add(match_providers);

  hideLoadingMessage();
}

// Function for querying by address point and neighborhood
function locationQuery(queryObj) {
  if (queryObj.hasOwnProperty('coordinates')) {
    var withinBoundary = {
      'type': 'Feature',
      'geometry': {
        'type': 'Polygon',
        'coordinates': queryObj.coordinates
      },
      'properties': {}
    };
  }
  else {
    var dummyPt = {
      'type': 'Feature',
      'geometry': {
        'type': 'Point',
        'coordinates': queryObj
      },
      'properties': {}
    };

    var ptBuffer = turf.buffer(dummyPt, 2, 'miles');
    // Correcting for strange error in turf that returns FeatureCollection
    var withinBoundary = ptBuffer.features[0];
  }

  queryArr = [];
  for (var i = 0; i < allProviders.length; ++i) {
    //
    if (turf.inside(allProviders[i], withinBoundary)) {
      queryArr.push(allProviders[i]);
    }
  }

  // if no search results are returned, then show all the providers
  if (queryArr.length !== 0) {
    medicareLayer.setGeoJSON(queryArr);
  } else {
    medicareLayer.setGeoJSON(allProviders);
  }

}

// Call Mapzen API, handle responses
function callMapzen() {
  $.ajax({
    url: search_url,
    data: {
      api_key: mapzen_key,
      "focus.point.lon": -87.63,
      "focus.point.lat": 41.88,
      text: inputElement.value
    },
    dataType: "json",
    success: function(data) {
      if (data && data.features) {
          map.setView([data.features[0].geometry.coordinates[1],
                       data.features[0].geometry.coordinates[0]], 14);
          locationQuery(data.features[0].geometry.coordinates);
        }
    },
    error: function(err) {
      console.log(err);
    }
  });
}

function screenReturnToTop() {
  // Return to top of page if search is on bottom
  if (document.documentElement.clientWidth < 780) {
    window.scrollTo(0,0);
  }
}

function hideLoadingMessage() {
  document.getElementById('loading_screen').style.display = 'none';
}
