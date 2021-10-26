const fs = require("fs")
const merge = require("deepmerge2");
const scanner = require("./scanner")
const _ = require("underscore")

const VPfile = "./virtual-personas.json"

var oldVPobj = fs.readFileSync(VPfile, "utf-8");
var oldVPjson = JSON.parse(oldVPobj);

function updateVPhistory(updateVPjson) {

    var newVPjson = merge(oldVPjson, updateVPjson);
    var newVPobj = JSON.stringify(newVPjson);
    fs.writeFile(VPfile, newVPobj, (err) => {
        if (err) {
            console.log("Error while writing file", err);
        }
        else {
            // console.log("\nFile written successfully")
        }
    })
    oldVPjson = newVPjson;
};

function determineCorrelationToAction(timestamp, statistics) {
    console.log("\nStatistics of " + new Date(parseInt(timestamp)));
    Object.entries(statistics["sensorsNearBy"]).forEach(sensor => {
        Object.entries(sensor[1]).forEach(measurement => {
            console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");
            
            Object.entries(measurement[1]).forEach(stat => {
                // console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]: ", stat);
                if (stat[0] === "stdev") {
                    console.log(stat[0] + ": " + stat[1]);
                }
                else if (stat[0] === "maxVarRightBefore") {
                    console.log(stat[0] + ": " + stat[1]);
                }
                else if (stat[0] === "maxVarOld") {
                    console.log(stat[0] + ": " + stat[1]);
                }
            })
        })
    })
}
 
const sensorsNearBy = [
    {
        id: "thunderboard_086bd7fe1054",
        measurements: ["light", "humidity"]
    },
    {
        id: "weather_station",
        measurements: ["light_level",]
    }
]

console.log("\nStart scanning")

scanner.scan(sensorsNearBy, updateVPhistory, determineCorrelationToAction);