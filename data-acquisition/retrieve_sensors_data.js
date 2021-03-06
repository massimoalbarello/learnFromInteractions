const fs = require("fs");
const parallel = require("run-parallel");
const flatten = require("flat").flatten;
const unflatten = require("flat").unflatten;

const settings = require("./../settings");
const influxQuery = require('../influx-db/query_data');
const influxWrite = require('../influx-db/write_data');
const featFunctions = require("./features");
const buzzer = require("./../feedback/buzzer").Buzzer;

const featFile = "./omnia/data-acquisition/features.json";
const logFile = "./omnia/data-acquisition/backupLog.json";
const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4

var oldFeatObj = fs.readFileSync(featFile, "utf-8");
var oldFeatJson = JSON.parse(oldFeatObj);

var oldLogObj = fs.readFileSync(logFile, "utf-8");
var oldLogJson = JSON.parse(oldLogObj);



var countSensorsSnapshots = 0;

// the measurements right before should depend on their timestamps, not a given number of values before the action
const measurementsRightBeforeAction = settings.measurementsRightBeforeAction;
const updateDatasetInterval = settings.updateDatasetInterval;

exports.retrieveData = async function(VPcandidate, triggerDevice, label, sensorsNearBy, noVPnearBy, updateDataset) {

    if (VPcandidate !== "") {
        var VPaddress = VPcandidate["address"];
        var VPdata = VPcandidate["data"];
        var btn0Timestamp = VPcandidate["timestamp"];
        var presence = 1;
    }
    else {
        var VPaddress = "automaticNoActionSnapshot"
        var VPdata = {};
        var btn0Timestamp = Date.now();
        if (noVPnearBy) {
            var presence = 0;
        }
        else {
            var presence = 1;
        }
    }
    
    console.log("\nGetting data from sensors...");
    var [newFeatJson, newLogJson] = await getSensorsValues(btn0Timestamp, triggerDevice, oldFeatJson, oldLogJson);  // [features extracted from sensors streams, log of the sensors streams]
    
    // print newly acquired features
    // var lastFeatures = newFeatJson[triggerDevice][btn0Timestamp];
    // console.log("\nFeatures of " + new Date(parseInt(btn0Timestamp)));
    // Object.entries(lastFeatures["sensorsNearBy"]).forEach(sensor => {
    //     Object.entries(sensor[1]).forEach(measurement => {
    //         console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");
    //         Object.entries(measurement[1]).forEach(feat => {
    //             console.log(feat);
    //         })
    //     })
    // })

    oldFeatJson = updateJsonFile(newFeatJson, featFile, "Features");
    oldLogJson = updateJsonFile(newLogJson, logFile, "Backup log");
    countSensorsSnapshots = countSensorsSnapshots + 1;

    if (countSensorsSnapshots === updateDatasetInterval) {
        updateDataset(newFeatJson[triggerDevice], triggerDevice);
        countSensorsSnapshots = 0;
    }

    function getSensorsValues(btn0Timestamp, triggerDevice, features, backupLog) {
        return new Promise(resolve => {
            var sensorsValues = {};

            // get data from sensors
            for (let sensor of sensorsNearBy) {
                sensorsValues[sensor["id"]] = {};
                for (let measurement of sensor["measurements"]) {
                    sensorsValues[sensor["id"]][measurement]  = async function (parallelCb) {
                        var res = await influxQuery.getStream(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 20", timestamp=btn0Timestamp);    // should use the timestamp of the trigger device instead of the thunderboard btn0
                        // console.log(res);
                        parallelCb(null, res);
                    }
                };
            }
            parallel(flatten(sensorsValues), function (err, results) {
                if (err) {
                    console.log("Error in parallel query: ", err);
                    feedbackBuzzer.alarm()
                }
                else {
                    sensorsValues = unflatten(results);    
                    // console.log(sensorsValues);                
                    let dataObjects = computeFeatures(sensorsValues, triggerDevice, features, backupLog);
                    resolve(dataObjects);
                }
            });
        });
    }

    function computeFeatures(sensorsValues, triggerDevice, features, backupLog) {

        features = initDatapoint(features, VPdata, btn0Timestamp, triggerDevice);
        backupLog = initDatapoint(backupLog, VPdata, btn0Timestamp, triggerDevice);
        
        for (const sensor of sensorsNearBy) {
            features[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]] = {};
            backupLog[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]] = {};
            for (var measurement of sensor["measurements"]) {
                var valuesStream = [];
                var timestampsStream = [];
                for (const value of sensorsValues[sensor["id"]][measurement]) {
                    valuesStream.push(value[measurement]);  // most recent value is the last in the array
                    timestampsStream.push(Date.parse(value["time"]));   // most recent timestamp is the last in the array
                }
                // console.log(measurement + ": " + valuesStream);
                if (valuesStream.length !== 0) {
                    var index = indexOfAction(timestampsStream, btn0Timestamp);   // index of the last measurement before the action was triggered
                    // console.log("Last measurement before action: " + valuesStream[index] + " at time: " + timestampsStream[index])
                    var valuesStream_right_before = valuesStream.slice(index - measurementsRightBeforeAction, index+1);     // most recent value is the last in the array
                    // console.log(valuesStream_right_before);
                    var valuesStream_old = valuesStream.slice(0, index - measurementsRightBeforeAction);    // most recent value is the last in the array
                    // console.log(valuesStream_old);
                    var norm_valuesStream = featFunctions.normalize(valuesStream);
                    var norm_values_right_before = norm_valuesStream.slice(index - measurementsRightBeforeAction, index+1);
                    var norm_values_old = norm_valuesStream.slice(0, index - measurementsRightBeforeAction);
                    
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
        }
        features[triggerDevice][btn0Timestamp]["someonePresent"] = presence;
        backupLog[triggerDevice][btn0Timestamp]["someonePresent"] = presence;
        
        influxWrite.storeFlat("features", triggerDevice, btn0Timestamp, features[triggerDevice][btn0Timestamp]);
        influxWrite.storeFlat("backup", triggerDevice, btn0Timestamp, backupLog[triggerDevice][btn0Timestamp]);
        console.log("Data successfully stored on InfluxDB.");
        
        return [features, backupLog];
    }



    function updateJsonFile(newJson, jsonFile, name) {
        let newObj = JSON.stringify(newJson);
        fs.writeFile(jsonFile, newObj, (err) => {
            if (err) {
                console.log("Error while writing file", err);
                feedbackBuzzer.alarm()
            }
            else {
                console.log(name + " successfully written to file.")
            }
        })
        return newJson;
    }

    function initDatapoint(datapoint, VPdata, btn0Timestamp, triggerDevice) {
        if (! datapoint.hasOwnProperty(triggerDevice)) {
            datapoint[triggerDevice] = {};
        }
        datapoint[triggerDevice][btn0Timestamp] = {};
        for (const VPmeasurement of Object.keys(VPdata)) {
            datapoint[triggerDevice][btn0Timestamp]["VP." + VPmeasurement] = VPdata[VPmeasurement];
        }
        datapoint[triggerDevice][btn0Timestamp]["hours"] = featFunctions.hours(btn0Timestamp);
        datapoint[triggerDevice][btn0Timestamp]["minutes"] = featFunctions.minutes(btn0Timestamp);
        datapoint[triggerDevice][btn0Timestamp]["triggeredByVP"] = VPaddress;
        datapoint[triggerDevice][btn0Timestamp]["sensorsNearBy"] = {};
        datapoint[triggerDevice][btn0Timestamp]["label"] = label;  // set to 1 if the light was switched on by this action or to 0 if it was switched off

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