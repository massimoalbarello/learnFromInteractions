const fs = require("fs");
const merge = require("deepmerge2");
// const _ = require("underscore");
const flatten = require("flat");
const fastcsv = require('fast-csv');

const scanner = require("./ble-discover/scanner");
const trigger = require("./trigger_server");
const sensors = require("./data-acquisition/retrieve_sensors_data");
const buzzer = require("./feedback/buzzer").Buzzer;



const VPfile = "./omnia/virtual-personas.json";
const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4
const offSnapshotInterval = 30000;

var oldVPobj = fs.readFileSync(VPfile, "utf-8");
var oldVPjson = JSON.parse(oldVPobj);
var possibleCandidate = "";
var triggerData = "";
var waitForCandidate = "";
var timeout = 5000;
var label = "";
var offSnapshotTimeout = "";



function updateVPhistory(updateVPjson) {
    var newVPjson = merge(oldVPjson, updateVPjson);
    var newVPobj = JSON.stringify(newVPjson);
    fs.writeFile(VPfile, newVPobj, (err) => {
        if (err) {
            console.log("Error while writing file", err);
            feedbackBuzzer.alarm()
        }
        else {
            // console.log("\nFile written successfully")
        }
    })
    oldVPjson = newVPjson;
};

function updateDataset(featJson, triggerDevice) {
    var dataset = [];
    Object.entries(featJson).forEach(([actionTimestamp, snapshot]) => {
        // console.log("Triggered by: " + snapshot["triggeredBy"] + " at timestamp: " + actionTimestamp)
        var flatSnapshot = flatten(snapshot);
        flatSnapshot["actionTimestamp"] = actionTimestamp;
        // dataset should not have values that are not numbers
        for (const [key, value] of Object.entries(flatSnapshot)) {
            if (typeof(value) !== "number") {
                delete flatSnapshot[key];
            } 
        }
        // console.log(flatSnapshot);
        dataset.push(flatSnapshot);
    })
    datasetName = triggerDevice + "_dataset.csv";
    fastcsv.writeToPath("./omnia/" + datasetName, dataset, {headers: true})
    .on('error', (err) => {
        console.log("Error while updating dataset", err);
        feedbackBuzzer.alarm();
    })
}



function getSnapshotsLabelledOff() {
    console.log("\nTaking off snapshot")
    sensors.retrieveData("", "r_402_lamp", 0, sensorsNearBy, updateDataset);    // considering "r_402_lamp" as the trigger device in this room
    offSnapshotTimeout = setTimeout(() => {
        getSnapshotsLabelledOff();
    }, offSnapshotInterval);
}

function stopOffSnapshotTimeout() {
    if (offSnapshotTimeout !== "") {
        clearTimeout(offSnapshotTimeout);
        offSnapshotTimeout = "";
        console.log("\nOff snapshot timeout stopped");
    }
}



function determineWhoTriggered(data) {
    feedbackBuzzer.beep();
    console.log("\nAction triggered in: " + data["room"] + " from device: " + data["trigger"]);
    console.log("New state: ", data["newState"]);
    triggerData = data;
    waitForCandidate = setTimeout(() => {
        triggerData = "";
        waitForCandidate = "";
        console.log("No candidate found")
    }, timeout);    
}

function setPossibleCandidate(VPaddress, VPdata, btn0Timestamp) {
    console.log("\n[" + VPaddress + "]: possible candidate found");
    possibleCandidate = {
        "address": VPaddress,
        "data": VPdata,
        "timestamp": btn0Timestamp
    };
    if (waitForCandidate !== "") {
        candidateFound(possibleCandidate);
    }
    else {
        setTimeout(() => {
            if (triggerData !== "") {
                candidateFound(possibleCandidate);
            }
            else {
                possibleCandidate = "";
                console.log("Couldn't find any action");
            }
        }, timeout)
    }
}


function candidateFound() {
    clearTimeout(waitForCandidate);
    waitForCandidate = "";
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
            console.log("Invalid label in trigger JSON");
            invalid = true;
    }
    if (! invalid) {
        sensors.retrieveData(possibleCandidate, triggerData["trigger"], label, sensorsNearBy, updateDataset);
    }
    else {
        console.log("Discarding datapoint");
    }
    triggerData = "";
    possibleCandidate = "";
}
 
const sensorsNearBy = [
    {
        id: "thunderboard_14b4576da75c",
        measurements: ["light", "humidity", "temperature", "tvoc", "uvi", "pressure"]
    },
    {
        id: "weather_station",
        measurements: ["light_level", "rain_intensity", "sun_azimuth", "sun_elevation", "sun_radiation", "temperature", "wind_speed"]
    }
]

feedbackBuzzer.start()

console.log("\nStart listening for triggers")
trigger.listen(determineWhoTriggered);

console.log("\nStart scanning for VPs")
scanner.scan(updateVPhistory, setPossibleCandidate, getSnapshotsLabelledOff, stopOffSnapshotTimeout);
