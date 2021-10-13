const Worker = require("tiny-worker");
const fs = require("fs")
const merge = require("deepmerge2");

const VPfile = "./virtual-personas.json"

var oldVPjson = fs.readFileSync(VPfile, "utf-8");
// console.log("\n########### old json ###########")
// console.log(oldVPjson);

const worker = new Worker("scanner.js");
 
worker.onmessage = function (ev) {

    // merge received json with oldVPobj 
    var updateVPjson = ev.data;
    console.log("\n########### update json ###########")
    console.log(updateVPjson);

    var newVPjson = merge(oldVPjson, updateVPjson)
    var newVPobj = JSON.stringify(newVPjson);
    // console.log("\n########### new json ###########")
    // console.log(newVPjson);
    fs.writeFile(VPfile, newVPobj, (err) => {
        if (err) {
            console.log("Error while writing file", err);
        }
        else {
            console.log("\nFile written successfully")
        }
    })
    oldVPjson = newVPjson;
};
 
worker.postMessage("\nStart recording");