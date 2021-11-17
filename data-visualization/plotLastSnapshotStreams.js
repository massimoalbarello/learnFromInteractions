const plotlib = require('nodeplotlib');
const fs = require("fs")
const math = require('mathjs');



const statFile = "./omnia/data-acquisition/backupLog.json"
const triggerDevice = "ganesh_lamp";
var statObj = fs.readFileSync(statFile, "utf-8");
var statistics = JSON.parse(statObj);

const lastTimestamp = Object.keys(statistics[triggerDevice]).sort().pop();
const actionTime = new Date(parseInt(lastTimestamp));
// console.log(statistics[triggerDevice][lastTimestamp]);

Object.entries(statistics[triggerDevice][lastTimestamp]["sensorsNearBy"]).forEach(sensor => {
    Object.entries(sensor[1]).forEach(measurement => {
        console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");

        var time = [ measurement[1]["stream"][1].map((timestamp, index) => {
            let date = new Date(timestamp);
            let hours = date.getHours();
            let minutes = "0" + date.getMinutes();
            let seconds = "0" + date.getSeconds();
            let time = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2)
            console.log(measurement[1]["stream"][0][index] + " at " + timestamp + " => " + time);
            return time;
        }) ];

        var timestamp = measurement[1]["stream"][1];
        
        Object.entries(measurement[1]).forEach(stat => {
            // console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]: ", stat);
            if (stat[0] === "normStream") {
                stackPlot(stat[1][0], timestamp, "Normalized stream {" + sensor[0] + "} [" + measurement[0] + "] of action taken at: " + actionTime)
            }
            if (stat[0] === "stream") {
                stackPlot(stat[1][0], timestamp, "Stream {" + sensor[0] + "} [" + measurement[0] + "] of action taken at: " + actionTime)
            } 
            else if (stat[0] === "firstDerivs") {
                stackPlot(stat[1], timestamp, "Standardized slope between adjacent points")
            }
        })
        plotlib.plot();
    })
})

function stackPlot(y, x, title) {
    var data = [ {
        x: x,
        y: y,
        type: 'line',
    } ];
    var layout = {
        title: title,
    };
    plotlib.stack(data, layout);
}