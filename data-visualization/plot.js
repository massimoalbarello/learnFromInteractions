const plotlib = require('nodeplotlib');
const fs = require("fs")
const math = require('mathjs');



const statFile = "../ble-discover/statistics.json"

var statObj = fs.readFileSync(statFile, "utf-8");
var statistics = JSON.parse(statObj);

const lastTimestep = Object.keys(statistics).sort().pop();
const actionTime = new Date(parseInt(lastTimestep));
// console.log(statistics[lastTimestep]);

Object.entries(statistics[lastTimestep]["sensorsNearBy"]).forEach(sensor => {
    Object.entries(sensor[1]).forEach(measurement => {
        console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");

        var time = [ measurement[1]["stream"][1].map((timestamp) => {
            let date = new Date(timestamp);
            let hours = date.getHours();
            let minutes = "0" + date.getMinutes();
            let seconds = "0" + date.getSeconds();
            let time = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2)
            console.log(timestamp + " => " + time);
            return time;
        }) ];
        var stream = measurement[1]["stream"][0];

        plotFunction(measurement[1]["stream"][0], measurement[1]["stream"][1], 'stream', "{" + sensor[0] + "} [" + measurement[0] + "] of action taken at: " + actionTime);
    })
})

function plotFunction(y, x, name, title) {
    var data = [ {
        x: x,
        y: y,
        type: 'line',
        name: name,
    } ];
    var layout = {
        title: title
    };
    plotlib.plot(data, layout);
}