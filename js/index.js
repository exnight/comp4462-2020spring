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
  const startDate = '2020-01-01';
  const endDate = '2020-01-04';
  let currDate = moment(startDate).startOf('day').subtract(1, 'days');
  let lastDate = moment(endDate).startOf('day');
  let dates = [];

  while(currDate.add(1, 'days').diff(lastDate) < 0) {
    dates.push(currDate.clone().format('YYYYMMDD'));
  }

  for (let idx = 0; idx < dates.length; idx++) {
    await DataFrame.fromCSV(`data/by_province/2020/${dates[idx]}.csv`).then(data => dfs.push(data));
  }

  let agg_df = dfs[0];
  if (dfs.length > 1) {
    for (let idx = 1; idx < dfs.length; idx++) {
      dfs[idx].toArray().forEach(row => {
        agg_df = agg_df.push(row);
      });
    }
  }

  let t0 = 0;
  let t1 = 23;
  let obs_type = 'AQI';

  let df = agg_df.filter(row => {
    let hour = parseInt(row.get('hour'), 10);
    return (hour >= t0) & (hour <= t1)
  });
  map_df = dfs[0].select('province', obs_type).groupBy('province')
    .aggregate(group => group.stat.mean(obs_type)).rename('aggregation', obs_type)
  map_data = map_df.toCollection();

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
        "data": {"values": map_data},
        "key": "province",
        "fields": [obs_type]
      }
    }],
    "mark": {
      "type": "geoshape",
      "stroke": "#757575",
      "strokeWidth": 0.5
    },
    "encoding": {
      "color": {
        "field": obs_type,
        "type": "quantitative",
        "scale": {"scheme": "Oranges"}
      },
      "tooltip": [
        {"field": "properties.NAME_1", "type": "nominal", "title": "Name"},
        {"field": "properties.NL_NAME_1", "type": "nominal", "title": "CH Name"}
      ]
    }
  }
  await vegaEmbed('#map', geoMapSpec);
}

load_data();


