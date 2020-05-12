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

const yearArray = ['2018', '2019', '2020'];
let dfs = {
  'df_2018': [],
  'df_2019': [],
  'df_2020': []
};

// TODO: connect controller with data
const startDate = '01-01';
const endDate = '01-04';
const t0 = 9;
const t1 = 19;
// TODO: . in column name
const obs_type = "PM10";
let map_mode = 'absolute';
map_mode = 'relative';

const main_func = async function() {
  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    let currDate = moment(`${year}-${startDate}`).startOf('day').subtract(1, 'days');
    let lastDate = moment(`${year}-${endDate}`).startOf('day');
    let dates = [];

    while(currDate.add(1, 'days').diff(lastDate) < 0) {
      dates.push(currDate.clone().format('YYYYMMDD'));
    }

    for (let idx = 0; idx < dates.length; idx++) {
      await DataFrame.fromCSV(`data/by_province/${year}/${dates[idx]}.csv`).then(data => dfs[`df_${year}`].push(data));
    }

    dfs[`agg_${year}`] = dfs[`df_${year}`][0];
    if (dfs[`df_${year}`].length > 1) {
      for (let idx = 1; idx < dfs[`df_${year}`].length; idx++) {
        dfs[`df_${year}`][idx].toArray().forEach(row => {
          dfs[`agg_${year}`] = dfs[`agg_${year}`].push(row);
        });
      }
    }
  }

  // TODO: add other plotting functions here
  plot_map();
};

const plot_map = () => {
  let df_2020 = dfs['agg_2020'].filter(row => {
    let hour = parseInt(row.get('hour'), 10);
    return (hour >= t0) & (hour <= t1)
  });

  map_2020 = df_2020.select('province', obs_type).groupBy('province')
    .aggregate(group => group.stat.mean(obs_type)).rename('aggregation', obs_type);

  map_2020 = map_2020.sortBy('province');

  if (map_mode === 'relative') {
    let df_2018 = dfs['agg_2018'].filter(row => {
      let hour = parseInt(row.get('hour'), 10);
      return (hour >= t0) & (hour <= t1)
    });

    map_2018 = df_2018.select('province', obs_type).groupBy('province')
    .aggregate(group => group.stat.mean(obs_type)).rename('aggregation', obs_type);

    let df_2019 = dfs['agg_2019'].filter(row => {
      let hour = parseInt(row.get('hour'), 10);
      return (hour >= t0) & (hour <= t1)
    });

    map_2019 = df_2019.select('province', obs_type).groupBy('province')
    .aggregate(group => group.stat.mean(obs_type)).rename('aggregation', obs_type);

    map_2018 = map_2018.sortBy('province');
    map_2019 = map_2019.sortBy('province');

    let data_2018 = map_2018.toDict()[obs_type];
    let data_2019 = map_2019.toDict()[obs_type];
    let data_2020 = map_2020.toDict()[obs_type];

    data = data_2018.map((e, i) => (e + data_2019[i])/2);
    data = data.map((e, i) => data_2020[i] - e);

    map_data = new DataFrame({
      column1: map_2020.toDict()['province'],
      column2: data,
    }, ['province', obs_type]).toCollection();
  } else {
    map_data = map_2020.toCollection();
  }

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
        "scale": {"scheme": "yellowgreenblue"}
      },
      "tooltip": [
        {"field": "properties.NAME_1", "type": "nominal", "title": "Name"},
        {"field": "properties.NL_NAME_1", "type": "nominal", "title": "CH Name"}
      ]
    }
  }
  vegaEmbed('#map', geoMapSpec);
}

// entry point
main_func();
