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


function getPollutant()
{
  var myselect=document.getElementById("mul-2-1");
  var index=myselect.selectedIndex ;
  var myvalue=myselect.options[index].value;

  alert(myvalue);
  return myvalue
}

function getHourRange()
{
  var myselect=document.getElementById("mul-2-3");
  var index=myselect.selectedIndex ;
  if (index==0)
  {
    return [0,23]
  }
  if (index==1)
  {
    return [9,18]
  }
}

function getDate()
{
  //check whether the selected day is valid
  
  var starting_day=document.getElementById("start_day").value;
  var ending_day=document.getElementById("end_day").value;
  
    if (starting_day.substr(3)=="01" || starting_day.substr(3)=="02" || starting_day.substr(3)=="03")
    {
      if (ending_day.substr(3)=="01" || ending_day.substr(3)=="02" || ending_day.substr(3)=="03")
      {
        return [starting_day, ending_day]
      }
    }
  alert("Please select two days between 1st Jan to 31st Mar and submit again")
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
// TODO: . in column name
// const obs_type = getPollutant();
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
// main_func();


// ----------------------------------------------------------
// LIU Hanmo starting below

let dfcity = {
  'df_2018': [],
  'df_2019': [],
  'df_2020': []
};

const startDateCity = '01-01';
const endDateCity = '04-01';

const load_data = async function() {
  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    let currDate = moment(`${year}-${startDateCity}`).startOf('day').subtract(1, 'days');
    let lastDate = moment(`${year}-${endDateCity}`).startOf('day');
    let dates = [];

    while(currDate.add(1, 'days').diff(lastDate) < 0) {
      dates.push(currDate.clone().format('YYYYMMDD'));
    }

    //read all the data.
    for (let idx = 0; idx < dates.length; idx++) {
      await DataFrame.fromCSV(`data/by_city/${year}/${dates[idx]}.csv`).then(data => dfcity[`df_${year}`].push(data));
    }

    //aggregate all the data into three files in years.
    dfcity[`agg_${year}`] = dfcity[`df_${year}`][0];
    if (dfcity[`df_${year}`].length > 1) {
      for (let idx = 1; idx < dfcity[`df_${year}`].length; idx++) {
        dfcity[`df_${year}`][idx].toArray().forEach(row => {
          dfcity[`agg_${year}`] = dfcity[`agg_${year}`].push(row);
        });
      } 
    }

    // add year label to the dataframes.
    dfcity[`agg_${year}`].map(row => row.set('year', row.get('date').slice(0, 4)));

    // reindex the hour to be accumulating.
    height = dfcity[`agg_${year}`].dim()[0];
    for(let h = 0; h < height; h++){
      dfcity[`agg_${year}`] = dfcity[`agg_${year}`].setRow(h, row.set('agg_hour', `${h}`));
    }
  }
  console.log(dfcity);
};

load_data();

let pollutant = 'NO2';

function selectData(loc, pollutant) {
  let dfSelected = [];
  for (let i = 0; i < yearArray.length; i++){
    const year = yearArray[i];
    dfSelected.push(dfs[`agg_${year}`].select('date', 'hour', 'location', 'year', 'agg_hour', pollutant).
      filter(row => row.get('location') === loc));
  }
  let finalDf = dfSelected[0].union(dfSelected[1]).union(dfSelected[2]);
  return finalDf;
}

let period = 15

function getBarData(period, pollutant, df){

  let dfBar = df;

  let middleDate = [];
  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    let currDate = moment(`${year}-${startDateCity}`).startOf('day').subtract(1, 'days');
    let lastDate = moment(`${year}-${endDateCity}`).startOf('day');

    while(currDate.add(period, 'days').diff(lastDate) <= 0) {
      middleDate.push(currDate.clone().format('YYYYMMDD'));
    }

    for(let j = 0; j < middleDate.length; j++){
      let mean = dfBar[idx].filter(row => {
        let date = parseInt(row.get('date'), 10);
        return (date >= parseInt(middleDate[j].subtract(period, 'days'), 10) &
        date < parseInt(middleDate[j], 10));
      }).stat.mean(pollutant);

      dfBar[idx].filter(row => {
        let date = parseInt(row.get('date'), 10);
        return (date >= parseInt(middleDate[j].subtract(period, 'days'), 10) &
        date < parseInt(middleDate[j], 10));
      }).map(row => row.set(pollutant, mean))
    }   
  }

  let finalDf = dfBar[0].union(dfBar[1]).union(dfBar[2]);
  return finalDf;
}

maps = ['#map1', '#map2', '#map3'];


//unfinished. Don't know how to plot bars and lines at the same time.
const plot_chart = (locs, pollutant) => {
  for(let i = 0; i < locs.length; i++){
    selected_df = selectData(locs[i], pollutant);
    selected_df_bar = getBarData(period, pollutant, selected_df);
    readableDf = selected_df.union(selected_df_bar).toCollection();
    const lineChart = {
      '$schema' : "https://vega.github.io/schema/vega-lite/v4.json",
      "width": 300, "height": 200,
      "data": {"values": readableDf},
      "encoding": {
        'x': {'field': 'agg_hour', 'type': "temporal"},
        'y': {'field': pollutant, 'type': 'quantitative'},
        'color': {'field': 'year', 'type': 'nominal'}
      }
    }

    vegaEmbed(maps[i], lineChart)
  }
}

