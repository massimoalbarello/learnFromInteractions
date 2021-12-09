const fs = require("fs");
const RFClassifier = require('ml-random-forest').RandomForestClassifier;
// const _ = require("underscore");

const settings = require('./settings');
const getDataForPrediction = require("./getDataForPrediction").getDataForPrediction;
const scanner = require("./ble-discover/scanner");
const trigger = require("./trigger_server");
const sensors = require("./data-acquisition/retrieve_sensors_data");
const buzzer = require("./feedback/buzzer").Buzzer;
const getLampState = require("./influx-db/query_data").getLampState;
const getDataset = require("./influx-db/getFeaturesFromStreams").getDataset;
const influxWrite = require('./influx-db/write_data');



const logNoMatchingFile = "./omnia/logNoMatching.json";
const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4
const automaticNoActionSnapshotInterval = settings.automaticNoActionSnapshotInterval;
const streamsDBname = settings.streamsDBname;
const sensorsNearBy = settings.sensorsNearBy;
const predictionsDBname = settings.predictionsDBname;
const namesVP = settings.namesVP;
const trainModelInterval = settings.trainModelInterval;
const predictionInterval = settings.predictionInterval;
const options = {
    seed: 3,
    maxFeatures: 0.8,
    replacement: true,
    nEstimators: 25
};
const classifier = new RFClassifier(options);
var lockRetrieveDataFunction = false;   // lock is initially available, taken while a function is calling sensors.retrieveData

var logNoMatchingObj = fs.readFileSync(logNoMatchingFile, "utf-8");
var logNoMatchingJson = JSON.parse(logNoMatchingObj);
var possibleCandidate = "";
var triggerData = "";
var waitForCandidate = "";
var candidate_actionTimeout = settings.candidate_actionTimeout;
var label = "";
var automaticNoActionSnapshotTimeout = "";
var noVPnearBy = false;     // set to true after scanner does not detect any VP near by
var isTrained = false;  // true once the model has been trained


function setNoVPnearBy() {
    noVPnearBy = true;
}

function resetNoVPnearBy() {
    noVPnearBy = false;
}

// functions for automatic snapshots when no recent action is detected
async function getAutomaticNoActionSnapshot() {
    if (!lockTaken()) {
        lockRetrieveDataFunction = true;
        console.log("\n[no action snapshot]: taking lock");
        console.log("Taking automatic no action snapshot");
        if (noVPnearBy) {
            console.log("Setting label to 0 (light should be off)");
            var currentLampState = 0;
        }
        else {
            var currentLampState = await getLampState();
            console.log("Setting label to ", currentLampState);
        }
        _ = await sensors.retrieveData(VPcandidate="", streamsDBname, label=currentLampState, sensorsNearBy, noVPnearBy, usedForPrediction=false);
        lockRetrieveDataFunction = false;
        console.log("[no action snapshot]: releasing lock");
    }
    else {
        console.log("[no action snapshot]: lock already taken");
    }
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
    console.log("\n{" + namesVP[VPaddress] + "}: possible candidate found");
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


async function candidateFound() {
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
    if (!invalid) {
        if (!lockTaken()) {
            lockRetrieveDataFunction = true;
            console.log("\n[candidate found]: taking lock");
            _ = await sensors.retrieveData(VPcandidate=possibleCandidate, streamsDBname, label, sensorsNearBy, noVPnearBy, usedForPrediction=false);
            lockRetrieveDataFunction = false;
            console.log("[candidate found]: releasing lock");
    
        }
        else {
            console.log("[candidate found]: lock already taken");
        }
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
            feedbackBuzzer.alarm();
        }
        else {
            // console.log("\nFile written successfully")
        }
    })
}

function lockTaken() {
    return lockRetrieveDataFunction;
}



feedbackBuzzer.start()

console.log("\nStart listening for triggers")
trigger.listen(determineWhoTriggered, getAutomaticNoActionSnapshot, stopAutomaticNoActionSnapshotTimeout);

console.log("\nStart scanning for VPs")
scanner.scan(setPossibleCandidate, setNoVPnearBy, resetNoVPnearBy);

trainModel();   // train model for the initial predictions

// periodically train model 
setInterval(async() => {
    trainModel();
}, trainModelInterval);

function trainModel() {
    new Promise(async () => {
        isTrained = false;
        console.log("\nGetting dataset to train new model...")
        var [features, labels] = await getDataset();
        if (features.length == labels.length) {
            console.log("\nTraining new model with " + labels.length + " datapoints...");
            classifier.train(features, labels);
            console.log("New model trained");
            isTrained = true;
        }
        else {
            console.log("Error while training model");
            feedbackBuzzer.alarm();
            isTrained = false;
        }
    })
}


// periodically make prediction
setInterval(async() => {
    if (isTrained) {
        if (!lockTaken()) {
            lockRetrieveDataFunction = true;
            console.log("\n[periodic prediction]: taking lock");
            const [features, streams, predictionTimestamp] = await getDataForPrediction(streamsDBname, sensorsNearBy, noVPnearBy);
            // console.log(features);
            var currentLampState = await getLampState();
            console.log("Current state: ", currentLampState);
            streams["label"] = currentLampState;
            // console.log(streams);
            const prediction = classifier.predict(features)[0];
            console.log("Prediction: ", prediction); 
            storePrediction(prediction, predictionTimestamp, currentLampState);     // store prediction and correct state
            if (currentLampState != prediction) {
                console.log("Wrong prediction :(");
                influxWrite.storeFlat(streamsDBname, predictionTimestamp, streams);  // adding datapoint with correct label to dataset
                console.log("Streams that resulted in a wrong prediction stored with correct label")
            }
            else {
                console.log("Correct prediction :)");
            }
            lockRetrieveDataFunction = false;
            console.log("[periodic prediction]: releasing lock");
        }
        else {
            console.log("[periodic prediction]: lock already taken");
        }
    }
    else {
        console.log("Model not yet trained")
    }
}, predictionInterval);

function storePrediction(prediction, predictionTimestamp, correctState) {
    influxWrite.storeFlat(predictionsDBname, predictionTimestamp, {
        "triggeredByVP": "prediction-correctState",
        "prediction": prediction,
        "correctState": correctState
    });
}