const plotlib = require('nodeplotlib');
const fs = require("fs")


const statFile = "../ble-discover/statistics.json"

var statObj = fs.readFileSync(statFile, "utf-8");
var statistics = JSON.parse(statObj);

const data = [{x: statistics["thunderboard_086bd7fe1054"]["light"]["stream"][1], y: statistics["thunderboard_086bd7fe1054"]["light"]["stream"][0], type: 'line'}];
plotlib.plot(data);

var steps = [...Array(statistics["thunderboard_086bd7fe1054"]["light"]["firstDerivs"].length).keys()];
const data2 = [{x: steps, y: statistics["thunderboard_086bd7fe1054"]["light"]["firstDerivs"], type: 'line'}];
plotlib.plot(data2);