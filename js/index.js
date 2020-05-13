console.log('main.js loaded');

const getCurrentTime = () => {
  let d = moment().format();
  document.getElementById("time").innerHTML = d;
};

const pickDate = () => {
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: "mm-dd"
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

//Newly Added: Get either relative or absolute mode
const getMode = () => {
  const modeDropdown = document.getElementById("mul-2-4");
  const index=modeDropdown.selectedIndex;
  return modeDropdown.options[index].value;
}

const getDates = () => {
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

// Hammer Modified. -----------------------------
let dfcity = {
  'df_2018': [],
  'df_2019': [],
  'df_2020': []
};

const startDateCity = '01-01';
const endDateCity = '04-01';
// Hammer Modified. ==============================

// TODO: connect controller with data
let [startDate, endDate] = getDates();
let [t0, t1] = getHourRange();
let obs_type = getPollutant();
let map_mode = getMode();
//map_mode = 'relative';


const main_func = async function() {
  await load_data();

  //Hammer -------------------------------------------

  await load_data_city();

  plot_chart(['Wuhan', 'Beijing', 'Shanghai'], 'NO2', '01-01', '02-01');
  //Hammer ===============================================

  // TODO: add other plotting functions here
  plot_map();
};

const update_func = async function() {
  const [d0, d1] = getDates();
  [t0, t1] = getHourRange();
  obs_type = getPollutant();
  map_mode = getMode();

  if (d0 != startDate || d1 != endDate) {
    console.log(startDate, endDate);
    startDate = d0;
    endDate = d1;
    console.log(startDate, endDate);
    await load_data();
  }

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
      if (!currDate.isSame('2020-02-29')) {
        dates.push(currDate.clone().format('YYYYMMDD'));
      }
    }
    // TODO: remove after debug
    // console.log(dates);

    for (let idx = 0; idx < dates.length; idx++) {
      await DataFrame.fromCSV(`data/by_province/${year}/${dates[idx]}.csv`).then(data => dfs[`df_${year}`].push(data));
    }

    dfs[`agg_${year}`] = dfs[`df_${year}`][0];
    if (dfs[`df_${year}`].length > 1) {
      for (let idx = 1; idx < dfs[`df_${year}`].length; idx++) {
        dfs[`agg_${year}`] = dfs[`agg_${year}`].union(dfs[`df_${year}`][idx]);
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

const load_data_city = async function() {
  console.log('load_data_city');

  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    let currDate = moment(`${year}-${startDateCity}`).startOf('day').subtract(1, 'days');
    let lastDate = moment(`${year}-${endDateCity}`).startOf('day');
    let dates = [];

    while(currDate.add(1, 'days').diff(lastDate) < 0) {
      // skip the date 02-29
      if(currDate.diff('2020-02-29') === 0){
        continue;
      }
      dates.push(currDate.clone().format('YYYYMMDD'));
    }

    console.log('date generated');
    //read all the data.

    for (let idx = 0; idx < dates.length; idx++) {
      await DataFrame.fromCSV(`data/by_city/${year}/${dates[idx]}.csv`).then(data => dfcity[`df_${year}`].push(data));
    }

    console.log(`${year}` + ' data read');

    //aggregate all the data into three files in years.
    dfcity[`agg_${year}`] = dfcity[`df_${year}`][0];
    if (dfcity[`df_${year}`].length > 1) {
      for (let idx = 1; idx < dfcity[`df_${year}`].length; idx++) {

        // union could be faster yet correct
        dfcity[`agg_${year}`] = dfcity[`agg_${year}`].union(dfcity[`df_${year}`][idx])
        
        
        // dfcity[`df_${year}`][idx].toArray().forEach(row => {
        //   dfcity[`agg_${year}`] = dfcity[`agg_${year}`].push(row);
        // });
      } 
    }

    console.log(`${year} ` + 'data aggregated');

    // add year label to the dataframes.
    dfcity[`agg_${year}`] = dfcity[`agg_${year}`].withColumn('year', () => `${year}`);

    console.log('year added for ' + `${year}`);
  }
};

//select data with the given location and pollutant's catagory
//return one dataframe of all three years 
selectData = function(loc, pollutant, startDate, endDate) {
  console.log('selectData is called')
  let dfSelected = [];
  for (let i = 0; i < yearArray.length; i++){
    const year = yearArray[i];
    let currDate = parseInt(moment(`${year}-${startDate}`).startOf('day').format('YYYYMMDD'), 10);
    let lastDate = parseInt(moment(`${year}-${endDate}`).startOf('day').format('YYYYMMDD'), 10);
    
    //select data according to the requirement and aggregate the hour.
    
    let tempDf = dfcity[`agg_${year}`].select('date', 'hour', 'location', 'year', pollutant)
      .filter(row => row.get('location') === loc).filter(row => {
        d = parseInt(row.get('date'), 10)
        return (d >= currDate) & (d <= lastDate);
      }).withColumn('agg_hour', (row, index) => index).withColumn(`mean ${pollutant}`, () => NaN);
    
    console.log('hour aggregated for' + ` ${year}`);
    // console.log(tempDf.toCollection());

    dfSelected.push(tempDf);
  }

  console.log(dfSelected[0].count());

  for (let i = 0; i < yearArray.length; i++){
    days = dfSelected[i].unique('date').toArray();
    num_days = days.length;
    middleDate = [days[num_days - 1]];
    while(num_days > 0){
      num_days = num_days - period;
      if(num_days < 0){
        middleDate.push(days[0]);
        break;
      }
      middleDate.push(days[num_days]);
    }

    middleDate = middleDate.reverse();

    for(let j = 0; j < middleDate.length - 1; j++){

      let tempDf = dfSelected[i].filter(row => {
        let date = parseInt(row.get('date'), 10);
        return (date >= parseInt(middleDate[j], 10) &
        date < parseInt(middleDate[j + 1], 10));
      });

      console.log(tempDf.count())

      let mean = tempDf.stat.mean(pollutant);

      console.log('mean calculated ' + `${mean}`);

      dfSelected[i] = dfSelected[i].union(tempDf.withColumn(`mean ${pollutant}`, () => mean));

      console.log('mean set');
    }

    dfSelected[i] = dfSelected[i].dropMissingValues([`mean ${pollutant}`]);

  }
  let finalDf = dfSelected[0].union(dfSelected[1]).union(dfSelected[2]);
  return finalDf;
};

// pre-define a length of dates for getting the mean.
const period = 15

// define the names of maps for use
maps = ['#map1', '#map2', '#map3'];

//Print the required curve.
//Should work now.
const plot_chart = (locs, pollutant, startDate, endDate) => {
  for(let i = 0; i < locs.length; i++){
    selected_df = selectData(locs[i], pollutant, startDate, endDate);
    // selected_df_bar = getBarData(period, pollutant, selected_df);
    readableDf = selected_df.toCollection();
    const lineChart = {
      '$schema' : "https://vega.github.io/schema/vega-lite/v4.json",
      "width": 600, "height": 400,
      "title": {
        "text": locs[i],
        "anchor": "start"
      },
      "data": {"values": readableDf},
      'layer': [
          {
        "mark": 'line',
        "encoding": {
          'x': {'field': 'agg_hour', 'type': 'quantitative'},
          'y': {'field': pollutant, 'type': 'quantitative'},
          'color': {'field': 'year', 'type': 'nominal'},
        }
      },
      {
        "mark": 'line',
        "encoding": {
          'x': {'field': 'agg_hour', 'type': 'quantitative'},
          'y': {'field': `mean ${pollutant}`, 'type': 'quantitative'},
          'color': {'field': 'year', 'type': 'nominal'}
      }
    }

    ]
    }

    vegaEmbed(maps[i], lineChart)
  }
};

// entry point
main_func();
