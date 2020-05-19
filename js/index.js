console.log("main.js loaded");

const getCurrentTime = () => {
  let d = moment().format();
  document.getElementById("time").innerHTML = d;
};

const pickDate = () => {
  $(".input-daterange input").each(function () {
    $(this)
      .datepicker({
        format: "mm-dd",
      })
      .show();
  });
};

const getPollutant = () => {
  const pollutantDropdown = document.getElementById("mul-2-1");
  const index = pollutantDropdown.selectedIndex;
  const selectedPollutant = pollutantDropdown.options[index].value;

  return selectedPollutant;
};

const getCity = () => {
  return $("#mul-2-2").val();
};

const getHourRange = () => {
  const hourDropdown = document.getElementById("mul-2-3");
  const index = hourDropdown.selectedIndex;
  if (index == 0) {
    return [0, 23];
  }
  if (index == 1) {
    return [9, 18];
  }
};

//Newly Added: Get either relative or absolute mode
const getMode = () => {
  const modeDropdown = document.getElementById("mul-2-4");
  const index = modeDropdown.selectedIndex;
  return modeDropdown.options[index].value;
};

const getDates = () => {
  //check whether the selected day is valid
  const d0_lim = "2019-12-31";
  const d1_lim = "2020-04-01";

  const d0 = moment("2020-".concat(document.getElementById("start_day").value));
  const d1 = moment("2020-".concat(document.getElementById("end_day").value));

  if (d0.isBetween(d0_lim, d1_lim) && d1.isBetween(d0_lim, d1_lim)) {
    if (d1 > d0) {
      return [d0.format("MM-DD"), d1.format("MM-DD")];
    } else {
      alert("Ending date needs to be later than starting date");
    }
  } else {
    alert("Please select two date from 1st Jan to 31st Mar and submit again");
  }
};

const DataFrame = dfjs.DataFrame;

const yearArray = ["2018", "2019", "2020"];
let dfs = {
  df_2018: [],
  df_2019: [],
  df_2020: [],
};

// Hammer Modified. -----------------------------
let dfcity = {
  agg_2018: [],
  agg_2019: [],
  agg_2020: [],
};

//Michael's Candle ---------------------------
let candle_stick = [];

const startDateCity = "01-01";
const endDateCity = "04-01";
// Hammer Modified. ==============================

let [startDate, endDate] = getDates();
let [t0, t1] = getHourRange();
let obs_type = getPollutant();
let map_mode = getMode();
let locs = getCity();

const main_func = async function () {
  await load_data();
  await load_data_city();
  await load_candle_stick();

  // TODO: add other plotting functions here
  plot_map();
  plot_chart(locs, obs_type, startDate, endDate);
  //Newly added
  plot_candle(locs, obs_type, startDate, endDate);
};

const update_func = async function () {
  const [d0, d1] = getDates();
  [t0, t1] = getHourRange();
  obs_type = getPollutant();
  map_mode = getMode();
  locs = getCity();

  if (d0 != startDate || d1 != endDate) {
    console.log(startDate, endDate);
    startDate = d0;
    endDate = d1;
    console.log(startDate, endDate);
    await load_data();
  }

  plot_chart(locs, obs_type, startDate, endDate);

  plot_map();

  //Newly added
  plot_candle(locs, obs_type, startDate, endDate);
};

const load_data = async function () {
  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    dfs[`df_${year}`] = [];

    let currDate = moment(`${year}-${startDate}`)
      .startOf("day")
      .subtract(1, "days");
    let lastDate = moment(`${year}-${endDate}`).startOf("day");
    let dates = [];

    while (currDate.add(1, "days").diff(lastDate) < 0) {
      if (!currDate.isSame("2020-02-29")) {
        dates.push(currDate.clone().format("YYYYMMDD"));
      }
    }

    for (let idx = 0; idx < dates.length; idx++) {
      await DataFrame.fromCSV(
        `data/by_province/${year}/${dates[idx]}.csv`
      ).then((data) => dfs[`df_${year}`].push(data));
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
  let df_2020 = dfs["agg_2020"].filter((row) => {
    let hour = parseInt(row.get("hour"), 10);
    return (hour >= t0) & (hour <= t1);
  });

  map_2020 = df_2020
    .select("province", obs_type)
    .groupBy("province")
    .aggregate((group) => group.stat.mean(obs_type))
    .rename("aggregation", obs_type);

  map_2020 = map_2020.sortBy("province");

  if (map_mode === "relative") {
    let df_2018 = dfs["agg_2018"].filter((row) => {
      let hour = parseInt(row.get("hour"), 10);
      return (hour >= t0) & (hour <= t1);
    });

    map_2018 = df_2018
      .select("province", obs_type)
      .groupBy("province")
      .aggregate((group) => group.stat.mean(obs_type))
      .rename("aggregation", obs_type);

    let df_2019 = dfs["agg_2019"].filter((row) => {
      let hour = parseInt(row.get("hour"), 10);
      return (hour >= t0) & (hour <= t1);
    });

    map_2019 = df_2019
      .select("province", obs_type)
      .groupBy("province")
      .aggregate((group) => group.stat.mean(obs_type))
      .rename("aggregation", obs_type);

    map_2018 = map_2018.sortBy("province");
    map_2019 = map_2019.sortBy("province");

    let data_2018 = map_2018.toDict()[obs_type];
    let data_2019 = map_2019.toDict()[obs_type];
    let data_2020 = map_2020.toDict()[obs_type];

    data = data_2018.map((e, i) => (e + data_2019[i]) / 2);
    data = data.map((e, i) => data_2020[i] - e);

    map_data = new DataFrame(
      {
        column1: map_2020.toDict()["province"],
        column2: data,
      },
      ["province", obs_type]
    ).toCollection();
  } else {
    map_data = map_2020.toCollection();
  }

  const geoMapSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v4.json",
    width: 800,
    height: 600,
    data: {
      url: "data/misc/cn_prov.json",
      format: {
        type: "topojson",
        feature: "CHN_adm1",
      },
    },
    transform: [
      {
        lookup: "properties.NAME_1",
        from: {
          data: { values: map_data },
          key: "province",
          fields: [obs_type],
        },
      },
    ],
    mark: {
      type: "geoshape",
      stroke: "#757575",
      strokeWidth: 0.5,
    },
    encoding: {
      color: {
        field: obs_type,
        type: "quantitative",
        scale: { scheme: "yellowgreenblue" },
      },
      tooltip: [
        { field: "properties.NAME_1", type: "nominal", title: "Name" },
        { field: "properties.NL_NAME_1", type: "nominal", title: "CH Name" },
      ],
    },
  };
  vegaEmbed("#map", geoMapSpec);
};

const load_data_city = async function () {
  console.log("load_data_city");
  // add year label to the dataframes.
  for (let idx = 0; idx < yearArray.length; idx++) {
    const year = yearArray[idx];
    console.log(`${year} read`);
    await DataFrame.fromCSV(
      `data/by_main_city/${year}_main_cities.csv`
    ).then((data) => dfcity[`agg_${year}`].push(data));

    dfcity[`agg_${year}`] = dfcity[`agg_${year}`][0].withColumn(
      "year",
      () => `${year}`
    );

    console.log("year added for " + `${year}`);
  }
};

//select data with the given location and pollutant's catagory
//return one dataframe of all three years
selectData = (loc, pollutant, startDate, endDate) => {
  console.log("selectData is called");
  let dfSelected = [];
  for (let i = 0; i < yearArray.length; i++) {
    const year = yearArray[i];
    let currDate = parseInt(
      moment(`${year}-${startDate}`).startOf("day").format("YYYYMMDD"),
      10
    );
    let lastDate = parseInt(
      moment(`${year}-${endDate}`).startOf("day").format("YYYYMMDD"),
      10
    );

    //select data according to the requirement and aggregate the hour.

    let tempDf = dfcity[`agg_${year}`]
      .select("date", "hour", "location", "year", pollutant)
      .filter((row) => row.get("location") === loc)
      .filter((row) => {
        d = parseInt(row.get("date"), 10);
        return (d >= currDate) & (d <= lastDate);
      })
      .withColumn("agg_hour", (row, index) => index);
    // .withColumn(`mean ${pollutant}`, () => NaN);

    console.log("hour aggregated for" + ` ${year}`);
    // console.log(tempDf.toCollection());

    dfSelected.push(tempDf);
  }

  console.log(dfSelected[0].count());

  for (let i = 0; i < yearArray.length; i++) {
    moveMean = movingMean(dfSelected[i].select(pollutant), pollutant);
    length = dfSelected[i].dim()[0];
    for (var j = 0; j < length; j++) {
      dfSelected[i] = dfSelected[i].setRow(j, (row) =>
        row.set(`mean ${pollutant}`, moveMean[j])
      );
    }
    // dfSelected[i] = dfSelected[i].map();
    // console.log(dfSelected[i].toCollection())
  }
  let finalDf = dfSelected[0].union(dfSelected[1]).union(dfSelected[2]);
  return finalDf;
};

// pre-define a length of dates for getting the mean.
const period = 15;

// define the names of maps for use
maps = ["#map1", "#map2", "#map3"];

//Print the required curve.
//Should work now.
const plot_chart = (locs, pollutant, startDate, endDate) => {
  for (let i = 0; i < locs.length; i++) {
    selected_df = selectData(locs[i], pollutant, startDate, endDate);
    // selected_df_bar = getBarData(period, pollutant, selected_df);
    readableDf = selected_df.toCollection();
    const lineChart = {
      $schema: "https://vega.github.io/schema/vega-lite/v4.json",
      width: 400,
      height: 200,
      title: {
        text: locs[i],
        anchor: "start",
      },
      data: { values: readableDf },
      layer: [
        {
          mark: "line",
          encoding: {
            x: { field: "agg_hour", type: "quantitative" },
            y: { field: pollutant, type: "quantitative" },
            color: { field: "year", type: "nominal" },
          },
        },
        {
          mark: "line",
          encoding: {
            x: { field: "agg_hour", type: "quantitative" },
            y: { field: `mean ${pollutant}`, type: "quantitative" },
            color: { field: "year", type: "nominal" },
          },
        },
      ],
    };

    vegaEmbed(maps[i], lineChart);
  }
};

// entry point
main_func();

const movingMean = (ipt, pollutant) => {
  iptArr = ipt.cast(pollutant, Number).toArray();
  // console.log(iptArr);
  const period = 21;
  let moveMean = [];
  for (var i = 0; i < (period - 1) / 2; i++) {
    moveMean.push(NaN);
  }
  for (var i = (period - 1) / 2; i < iptArr.length - (period - 1) / 2; i++) {
    var sum = 0;
    for (var j = 0; j < period; j++) {
      sum = sum + iptArr[i - (period - 1) / 2 + j][0];
    }
    moveMean.push(sum / period);
  }
  for (var i = 0; i < (period - 1) / 2; i++) {
    moveMean.push(NaN);
  }

  return moveMean;
};


const load_candle_stick = async function () {
  console.log("load_candle_stick");
  // add year label to the dataframes.
 
    //console.log(`${year} read`);
    await DataFrame.fromCSV(
      `data/by_main_city/candlestick2020.csv`
    ).then((data) => candle_stick.push(data));


    //console.log("year added for " + `${year}`);
  
};


selectCandleData = (loc, pollutant, startDate, endDate) => {
  console.log("selecCandleData is called");
  
  //Get an array of date

  const year = 2020;
  let currDate = parseInt(
    moment(`${year}-${startDate}`).startOf("day").format("YYYYMMDD"),
    10
  );
  let lastDate = parseInt(
    moment(`${year}-${endDate}`).startOf("day").format("YYYYMMDD"),
    10
  );
    

    let tempDf = candle_stick[0]
      .filter((row) => row.get("city") === loc)
      .filter((row) => row.get("pollutant") === pollutant)
      .filter((row) => {
        d = parseInt(row.get("date"), 10);
        return (d >= currDate) & (d <= lastDate);
      })
    // .withColumn("agg_hour", (row, index) => index);
    // .withColumn(`mean ${pollutant}`, () => NaN);

    //console.log("hour aggregated for" + ` ${year}`);
    // console.log(tempDf.toCollection());
  return tempDf;
};

const plot_candle = (locs, pollutant, startDate, endDate) => {
  
  selected_df = selectCandleData(locs[0], pollutant, startDate, endDate);
  // selected_df_bar = getBarData(period, pollutant, selected_df);
  readableDf = selected_df.toCollection();
  const candlestick = {
    $schema: "https://vega.github.io/schema/vega-lite/v4.json",
    width: 400,
    title:locs[0]+' In 2020',
    description: "A candlestick chart inspired by an example in Protovis (http://mbostock.github.io/protovis/ex/candlestick.html)",
    data: {values: readableDf},
    encoding: {
      x: {
        field: "newdate", 
        type: "temporal", 
        title: "Date in 2020",
        axis: {
              format: "%Y/%m/%d",
              labelAngle: -45,
              title: "Date in 2020"
            }
        },
      color: {
        condition: {
          test: "datum.start < datum.end",
          value: "#06982d"
        },
        value: "#ae1325"
      }
    },
    layer: [
      {
        mark: "rule",
        encoding: {
          y: {
            field: "low", "type": "quantitative",
            scale: {"zero": false},
            title: "Concentration"
  
          },
          "y2": {field: "high"}
        }
      },
      {
        mark: "bar",
        encoding: {
          y: {"field": "start", "type": "quantitative"},
          y2: {"field": "end"}
        }
      }
    ]
  }
  vegaEmbed(candle, candlestick);
  
};