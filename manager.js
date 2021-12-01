const fs = require("fs");
const merge = require("deepmerge2");
// const _ = require("underscore");

const settings = require('./settings');
const scanner = require("./ble-discover/scanner");
const trigger = require("./trigger_server");
const sensors = require("./data-acquisition/retrieve_sensors_data");
const buzzer = require("./feedback/buzzer").Buzzer;
const getLampState = require("./influx-db/query_data").getLampState;



const logNoMatchingFile = "./omnia/logNoMatching.json";
const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4
const automaticNoActionSnapshotInterval = settings.automaticNoActionSnapshotInterval;
const databaseName = settings.databaseName;
const namesVP = settings.namesVP;

var logNoMatchingObj = fs.readFileSync(logNoMatchingFile, "utf-8");
var logNoMatchingJson = JSON.parse(logNoMatchingObj);
var possibleCandidate = "";
var triggerData = "";
var waitForCandidate = "";
var candidate_actionTimeout = settings.candidate_actionTimeout;
var label = "";
var automaticNoActionSnapshotTimeout = "";
var noVPnearBy = false;     // set to true after scanner does not detect any VP near by



function setNoVPnearBy() {
    noVPnearBy = true;
}

function resetNoVPnearBy() {
    noVPnearBy = false;
}

// functions for automatic snapshots when no recent action is detected
async function getAutomaticNoActionSnapshot() {
    console.log("\nTaking automatic no action snapshot");
    if (noVPnearBy) {
        console.log("Setting label to 0 (light should be off)");
        var currentLampState = 0;
    }
    else {
        var currentLampState = await getLampState();
        console.log("Setting label to ", currentLampState);
    }
    sensors.retrieveData("", databaseName, currentLampState, sensorsNearBy, noVPnearBy);    // considering lamp in this room as the trigger device
    automaticNoActionSnapshotTimeout = setTimeout(() => {
        getAutomaticNoActionSnapshot();
    }, automaticNoActionSnapshotInterval);
}

function stopAutomaticNoActionSnapshotTimeout() {
    if (automaticNoActionSnapshotTimeout !== "") {
        clearTimeout(automaticNoActionSnapshotTimeout);
        automaticNoActionSnapshotTimeout = "";
        console.log("\nAutomatic no action snapshot timeout stopped");
    }
}



function determineWhoTriggered(data) {
    feedbackBuzzer.beep();
    console.log("\nAction triggered in: " + data["room"]);
    console.log("New state: ", data["newState"]);
    triggerData = data;
    waitForCandidate = setTimeout(() => {
        triggerData = "";
        waitForCandidate = "";
        console.log("No candidate found");
        logNoMatchingJson["countActionsWithoutCandidate"] += 1;
        writeJsonToFile(logNoMatchingJson, logNoMatchingFile);
    }, candidate_actionTimeout);    
}

function setPossibleCandidate(VPaddress, VPdata, btn0Timestamp) {
    console.log("\n[" + namesVP[VPaddress] + "]: possible candidate found");
    possibleCandidate = {
        "address": namesVP[VPaddress],
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
                logNoMatchingJson["candidatesWithoutActions"].push([namesVP[VPaddress], new Date(btn0Timestamp)]);
                writeJsonToFile(logNoMatchingJson, logNoMatchingFile);
                console.log("Couldn't find any action");
            }
        }, candidate_actionTimeout)
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
        sensors.retrieveData(possibleCandidate, databaseName, label, sensorsNearBy, noVPnearBy);
    }
    else {
        console.log("Discarding datapoint");
    }
    triggerData = "";
    possibleCandidate = "";
}

function writeJsonToFile(newJson, file) {
    var newObj = JSON.stringify(newJson);
    fs.writeFile(file, newObj, (err) => {
        if (err) {
            console.log("Error while writing file", err);
            feedbackBuzzer.alarm()
        }
        else {
            // console.log("\nFile written successfully")
        }
    })
}


 
const sensorsNearBy = settings.sensorsNearBy;

feedbackBuzzer.start()

console.log("\nStart listening for triggers")
trigger.listen(determineWhoTriggered, getAutomaticNoActionSnapshot, stopAutomaticNoActionSnapshotTimeout);

console.log("\nStart scanning for VPs")
scanner.scan(setPossibleCandidate, setNoVPnearBy, resetNoVPnearBy);
