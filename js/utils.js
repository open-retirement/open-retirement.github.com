// Names for overall score, can be changed
var overall_mapping = [ "Unavailable", "Poor", "Below Average", "Average",
                        "Above Average", "Excellent" ];

var markerColorArr = ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"];

var readScore = function(score) {
  if (score === undefined || score === null) {
    return "N/A";
  }
  else {
    var star_string = "";
    for (var i = 0; i < parseInt(score); ++i) {
      star_string += "<img src='img/star.png' class='star'>";
    }
    return star_string;
  }
};

var punctuatePhone = function(phone_string) {
	return "(" + phone_string.substr(0,3) + ") " + phone_string.substr(3,3) + "-" + phone_string.substr(6,4);
};
