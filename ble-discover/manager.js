const fs = require("fs")
const merge = require("deepmerge2");
const scanner = require("./scanner")
const _ = require("underscore")

const VPfile = "./virtual-personas.json"

var oldVPobj = fs.readFileSync(VPfile, "utf-8");
var oldVPjson = JSON.parse(oldVPobj);
// console.log("\n########### old json ###########")
// console.log(oldVPjson);

function updateVPhistory(updateVPjson) {

    // console.log("\n########### update json ###########")
    // console.log(updateVPjson);

    var newVPjson = merge(oldVPjson, updateVPjson);
    // console.log("\n########### new json ###########")
    // console.log(newVPjson);
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
scanner.scan(sensorsNearBy, updateVPhistory);