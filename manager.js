const fs = require("fs");
const merge = require("deepmerge2");
const scanner = require("./ble-discover/scanner")
// const _ = require("underscore");
const flatten = require("flat");
const fastcsv = require('fast-csv');

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

function updateDataset(statJson) {
    var dataset = [];
    Object.entries(statJson).forEach(snapshot => {
        // console.log("Triggered by: " + snapshot[1]["triggeredBy"] + " at timestamp: " + snapshot[0])
        // console.log(flatten(snapshot[1]["sensorsNearBy"]));
        var flatSnapshot = flatten(snapshot[1]["sensorsNearBy"]);
        flatSnapshot["timestamp"] = snapshot[0];
        flatSnapshot["triggeredBy"] = snapshot[1]["triggeredBy"];
        flatSnapshot["label"] = snapshot[1]["label"];
        // console.log(flatSnapshot);
        dataset.push(flatSnapshot);
    })
    const ws = fs.createWriteStream("dataset.csv");
    fastcsv.write(dataset, { headers: true })
           .pipe(ws);
    
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

scanner.scan(sensorsNearBy, updateVPhistory, updateDataset);