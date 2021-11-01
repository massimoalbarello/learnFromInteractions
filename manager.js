const fs = require("fs");
const merge = require("deepmerge2");
// const _ = require("underscore");
const flatten = require("flat");
const fastcsv = require('fast-csv');

const scanner = require("./ble-discover/scanner");
const trigger = require("./trigger_server");
const sensors = require("./data-acquisition/retrieve_sensors_data");
const buzzer = require("./feedback/buzzer").Buzzer;



const VPfile = "./virtual-personas.json";
const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4

var oldVPobj = fs.readFileSync(VPfile, "utf-8");
var oldVPjson = JSON.parse(oldVPobj);
var possibleCandidate = "";
var waitForTrigger = "";
var timeout = 5000;
var label = "";

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

function updateDataset(statJson, triggerDevice) {
    var dataset = [];
    Object.entries(statJson).forEach(snapshot => {
        // console.log("Triggered by: " + snapshot[1]["triggeredBy"] + " at timestamp: " + snapshot[0])
        // console.log(flatten(snapshot[1]["sensorsNearBy"]));
        var flatSnapshot = flatten(snapshot[1]["sensorsNearBy"]);
        flatSnapshot["hours"] = snapshot[1]["hours"];
        flatSnapshot["minutes"] = snapshot[1]["minutes"];
        flatSnapshot["timestamp"] = snapshot[0];
        flatSnapshot["triggeredBy"] = snapshot[1]["triggeredBy"];
        flatSnapshot["label"] = snapshot[1]["label"];
        // console.log(flatSnapshot);
        dataset.push(flatSnapshot);
    })
    datasetName = triggerDevice + "_dataset.csv"
    const ws = fs.createWriteStream(datasetName);
    fastcsv.write(dataset, { headers: true })
           .pipe(ws);
}

function determineWhoTriggered(triggerData) {
    console.log("\nAction triggered in: " + triggerData["room"] + " from device: " + triggerData["trigger"]);
    // check if a possible candidate had already been found and it's thus waiting for an action
    if (waitForTrigger !== "") {
        candidateFound(triggerData);
    }
    else {
        setTimeout(() => {
            if (possibleCandidate !== "") {
                candidateFound(triggerData);
            }
            else {
                console.log("Couldn't find any candidate")
            }
        }, timeout)
    }
}

function candidateFound(triggerData) {
    clearTimeout(waitForTrigger);
    waitForTrigger = "";
    let triggerDevice = "";
    let invalid = false;
    console.log("Candidate: " + possibleCandidate["address"]);
    feedbackBuzzer.doubleBeep();
    switch (triggerData["newState"]) {
        case "On":
            label = 1;
            break;
        case "Off":
            label = 0;
            break;
        default:
            console.log("Invalid label in trigger JSON")
            invalid = true;
    }
    if (! invalid) {
        sensors.retrieveData(possibleCandidate["address"], possibleCandidate["timestamp"], triggerData["trigger"], label, sensorsNearBy, updateDataset);
    }
    else {
        console.log("Discarding datapoint");
    }

    possibleCandidate = "";
}

function setPossibleCandidate(VPdata, VPaddress, timestamp) {
    console.log("\n[" + VPaddress + "]: possible candidate found");
    possibleCandidate = {
        "address": VPaddress,
        "data": VPdata,
        "timestamp": timestamp
    };
    waitForTrigger = setTimeout(() => {
        possibleCandidate = "";
        console.log("No action found")
        waitForTrigger = "";
    }, timeout)

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

console.log("\nStart listening for triggers")
trigger.listen(determineWhoTriggered);

console.log("\nStart scanning for VPs")
scanner.scan(updateVPhistory, setPossibleCandidate);
