console.log('main.js loaded');

const getCurrentTime = () => {
  let d = moment().format();
  document.getElementById("time").innerHTML = d;
};

const pickDate = () => {
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: "dd-mm-yyyy"
    }).show();
  });
};

const DataFrame = dfjs.DataFrame;
let dfs = [];
const load_data = async function() {
  await DataFrame.fromCSV('data/trans_2020/20200101.csv').then(data => dfs.push(data));
  let df = dfs[0];
  let loc = 'Wuhan';
  let t0 = 0;
  let t1 = 3;
  let obs_type = 'PM2.5';
  let res = df.filter(row => {
    let hour = parseInt(row.get('hour'), 10);
    return (hour >= t0) & (hour <= t1) & (row.get('location') == loc)
  }).select('hour', obs_type).toJSON();
  console.log(res);
}

load_data();

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
  "transform": [{
    "lookup": "properties.NAME_1",
    "from": {
      "data": {
        "url": "data/trans_2020/20200101.csv"
      },
      "key": "location",
      "fields": ["AQI"]
    }
  }],
  "projection": {
    "type": "mercator"
  },
  "mark": {
    "type": "geoshape",
    "stroke": "#757575",
    "strokeWidth": 0.5
  },
  "encoding": {
    "color": {
      "field": "AQI",
      "type": "quantitative",
      // "scale": {"scheme": "Oranges"}
    },
    "tooltip": [
      {"field": "properties.NAME_1", "type": "nominal", "title": "Name"},
      // {"field": "properties.NL_NAME_1", "type": "nominal", "title": "CH Name"}
    ]
  }
}
vegaEmbed('#map', geoMapSpec);
