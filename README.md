# Chicago Nursing Home Search

This is a tool for people to research nursing homes in the Chicagoland area using
[nursing home provider info from Medicare](https://data.medicare.gov/Nursing-Home-Compare/Provider-Info/4pq5-n9py).

See the live site here: [Chicago Nursing Home Search](http://chicagonursinghomesearch.com/)

## Running Locally

If you want to run the site on your computer, you can clone it through git with:

``` bash
git clone https://github.com/open-retirement/open-retirement.github.com.git
cd open-retirement.github.com

# to run locally
python -m SimpleHTTPServer
```

Then navigate to http://localhost:8000/ in a browser.

## Contributing

If you'd like to contribute, fork the repository, make any changes in a separate
branch, and open up a pull request against the `master` branch.

Currently we're using Bower for front end dependencies, so you'll need `npm` installed
to update any libraries. Just run `npm install` in the root directory, and it will
install Grunt, Bower, and build the current libraries.

## Credits

All data provided by [Medicare](https://data.medicare.gov/), with additional datasets
on their site.
