console.log('main.js loaded');

const getCurrentTime = () => {
  let d = moment().format();
  console.log(d);
  document.getElementById("time").innerHTML = d;
};
