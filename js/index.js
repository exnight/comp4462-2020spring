console.log('main.js loaded');

const getCurrentTime = () => {
  let d = moment().format();
  console.log(d);
  document.getElementById("time").innerHTML = d;
};

const pickDate = () => {
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: "dd-mm-yyyy"
    }).show();
  });
};

const geoMapSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
  "width": 800,
  "height": 600,
  "data": {
    "url": "data/misc/cn_prov.json",
    "format": {
      "type": "topojson",
      "feature": "CHN_adm1"
    }
  },
  // "transform": [{
  //   "lookup": "properties.NAME_1",
  //   "from": {
  //     "data": {
  //       "url": "data/2020/20200101.csv"
  //     },
  //     "key": "id",
  //     "fields": ["rate"]
  //   }
  // }],
  "projection": {
    "type": "mercator"
  },
  "mark": {
    "type": "geoshape",
    "fill": "#eee",
    "stroke": "#757575",
    "strokeWidth": 0.5
  },
  "encoding": {
    "color": {"value": "#eee"},
    "tooltip": [
      {"field": "properties.NAME_1", "type": "nominal", "title": "Name"},
      // {"field": "properties.NL_NAME_1", "type": "nominal", "title": "CH Name"}
    ]
  }
}
vegaEmbed('#map', geoMapSpec);
