// Get provider_id from URL parameter
var provider_id = window.location.search.replace(/^\?/, "");

var data = {
    "title": "Test",
    "names": [
        {"name": "One"},
        {"name": "Two"}
    ]
};

// Get template from script in page
var template = $('#detail-template').html();
var compiledTemplate = Handlebars.compile(template);
var result = compiledTemplate(data);
$('#main').html(result);
