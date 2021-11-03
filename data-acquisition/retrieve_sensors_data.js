const fs = require("fs")

const influx = require('../influx-db/query_data');
const featFunctions = require("./features");

const featFile = "./data-acquisition/features.json";
const logFile = "./data-acquisition/backupLog.json";


var oldFeatObj = fs.readFileSync(featFile, "utf-8");
var oldFeatJson = JSON.parse(oldFeatObj);

var oldLogObj = fs.readFileSync(logFile, "utf-8");
var oldLogJson = JSON.parse(oldLogObj);



var countSensorsSnapshots = 0;
const measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action


exports.retrieveData = async function(VPaddress, btn0Timestamp, triggerDevice, label, sensorsNearBy, updateDataset) {
    console.log("\nGetting data from sensors...");
    dataObjects = await getFeatFromSensors(btn0Timestamp, triggerDevice, oldFeatJson, oldLogJson);
    var newFeatJson = dataObjects[0];   // features extracted from sensors streams
    var newLogJson = dataObjects[1];    // log of the sensors streams
    
    // print newly acquired features
    var lastFeatures = newFeatJson[triggerDevice][btn0Timestamp];
    console.log("\nFeatures of " + new Date(parseInt(btn0Timestamp)));
    Object.entries(lastFeatures["sensorsNearBy"]).forEach(sensor => {
        Object.entries(sensor[1]).forEach(measurement => {
            console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");
            Object.entries(measurement[1]).forEach(feat => {
                console.log(feat);
            })
        })
    })

    oldFeatJson = updateJsonFile(newFeatJson, featFile, "Features");
    oldLogJson = updateJsonFile(newLogJson, logFile, "Backup log");
    countSensorsSnapshots = countSensorsSnapshots + 1;

    if (countSensorsSnapshots === 1) {
        updateDataset(newFeatJson[triggerDevice], triggerDevice);
        countSensorsSnapshots = 0;
    }

    async function getFeatFromSensors(btn0Timestamp, triggerDevice, features, backupLog) {
        var sensorsValues = {};
        features = initDatapoint(features, btn0Timestamp, triggerDevice);
        backupLog = initDatapoint(backupLog, btn0Timestamp, triggerDevice);
        // get data and features from sensors

        // !!! should get data from the db in parallel so that we have to wait for "timeAfterAction" in query_data.js only once
        for (const sensor of sensorsNearBy) {
            sensorsValues[sensor["id"]] = {};
            features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]] = {};
            backupLog[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]] = {};
            for (var measurement of sensor["measurements"]) {
                sensorsValues[sensor["id"]][measurement]  = await influx.db(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 20", timestamp=btn0Timestamp);    // should use the timestamp of the trigger device instead of the thunderboard btn0
                var valuesStream = [];
                var timestampsStream = [];
                for (const value of sensorsValues[sensor["id"]][measurement]) {
                    valuesStream.push(value[measurement]);
                    timestampsStream.push(Date.parse(value["time"]));
                }
                var index = indexOfAction(timestampsStream, btn0Timestamp);   // index of the last measurement before the action was triggered
                // console.log("Last measurement before action: " + valuesStream[index] + " at time: " + timestampsStream[index])
                var valuesStream_right_before = valuesStream.slice(index - measurementsRightBeforeAction, index+1);
                var valuesStream_old = valuesStream.slice(0, index - measurementsRightBeforeAction);
                var norm_valuesStream = featFunctions.normalize(valuesStream);
                var norm_values_right_before = norm_valuesStream.slice(index - measurementsRightBeforeAction, index+1);
                // console.log(norm_values_right_before);
                var norm_values_old = norm_valuesStream.slice(0, index - measurementsRightBeforeAction);
                // console.log(norm_values_old);
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["lastMeasurementBeforeAction"] = valuesStream[index];
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanRightBefore"] = featFunctions.mean(valuesStream_right_before);
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanOld"] = featFunctions.mean(valuesStream_old);
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stdev"] = featFunctions.stdev(norm_valuesStream);
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarRightBefore"] = featFunctions.maxVariation(norm_values_right_before);
                features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarOld"] = featFunctions.maxVariation(norm_values_old);
                
                backupLog[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                backupLog[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stream"] = featFunctions.stream(valuesStream, timestampsStream);
                // backupLog[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["normStream"] = featFunctions.stream(norm_valuesStream, timestampsStream);


            }
        }
        // console.log("\nFeatures update:\n", features[triggerDevice][btn0Timestamp]);
        
        return [features, backupLog];
    }



    function updateJsonFile(newJson, jsonFile, name) {
        let newObj = JSON.stringify(newJson);
        fs.writeFile(jsonFile, newObj, (err) => {
            if (err) {
                console.log("Error while writing file", err);
            }
            else {
                console.log("\n" + name + " successfully written to file.")
            }
        })
        return newJson;
    }

    function initDatapoint(datapoint, btn0Timestamp, triggerDevice) {
        if (! datapoint.hasOwnProperty(triggerDevice)) {
            datapoint[triggerDevice] = {};
        }
        datapoint[triggerDevice][btn0Timestamp] = {
            "hours": featFunctions.hours(btn0Timestamp),
            "minutes": featFunctions.minutes(btn0Timestamp),
            "triggeredByVP": VPaddress,
            "sensorsNearBy": {},
            "label": label,  // set to 1 if the light was switched on by this action or to 0 if it was switched off
        };
        return datapoint;
    }


    function indexOfAction(timestampsStream, btn0Timestamp) {
        var index = 0;
        for (const [i, time] of timestampsStream.entries()) {
            if (time < btn0Timestamp) {
                index = i;
            }
        }
        return index;
    }
}