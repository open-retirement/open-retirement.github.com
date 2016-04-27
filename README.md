# Chicago Nursing Home Search

Start of basic demo pulling data directly from [Medicare Open Data](https://data.medicare.gov/)

Specific dataset used is for [Provider Info](https://data.medicare.gov/Nursing-Home-Compare/Provider-Info/4pq5-n9py)

[Live demo here](http://open-retirement.github.io)

## Setup
The app runs on Python 2.7 and Flask, and the easiest way to get this working is
through a virtualenv in Python. We use `virtualenvwrapper` here, but even without
a virtualenv you should be able to get it running.

If you have `virtualenvwrapper` installed, run `mkvirtualenv nursing-homes`, then
`workon nursing-homes`. Once you're in the new virtual environment, just run

```
pip install -r requirements.txt
python app.py
```

And you should be able to view the application in your browser at localhost:5000
