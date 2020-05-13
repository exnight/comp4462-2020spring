console.log('main.js loaded');

const getCurrentTime = () => {
  let d = moment().format();
  document.getElementById("time").innerHTML = d;
};

const pickDate = () => {
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: "dd-mm"
    }).show();
  });
};

const getPollutant = () => {
  const pollutantDropdown = document.getElementById("mul-2-1");
  const index = pollutantDropdown.selectedIndex ;
  const selectedPollutant = pollutantDropdown.options[index].value;

  return selectedPollutant;
};

const getHourRange = () => {
  const hourDropdown = document.getElementById("mul-2-3");
  const index = hourDropdown.selectedIndex ;
  if (index == 0) {
    return [0, 23]
  }
  if (index == 1) {
    return [9, 18]
  }
};

const getDate = () => {
  //check whether the selected day is valid
  const d0_lim = '2019-12-31';
  const d1_lim = '2020-04-01';

  const d0 = moment('2020-'.concat(document.getElementById("start_day").value));
  const d1 = moment('2020-'.concat(document.getElementById("end_day").value));

  if (d0.isBetween(d0_lim, d1_lim) && d1.isBetween(d0_lim, d1_lim)) {
    if (d1 > d0) {
      return [d0.format('MM-DD'), d1.format('MM-DD')];
    } else {
      alert('Ending date needs to be later than starting date');
    }
  } else {
    alert('Please select two date from 1st Jan to 31st Mar and submit again');
  }
}

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

const obs_type = getPollutant();
let map_mode = 'absolute';
map_mode = 'relative';


const main_func = async function() {
  await load_data();

  // TODO: add other plotting functions here
  plot_map();
};

const load_data = async function() {
  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    dfs[`df_${year}`] = [];

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
