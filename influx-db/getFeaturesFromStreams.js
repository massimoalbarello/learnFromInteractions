const Influx = require("influx");
const flatten = require("flat");
const unflatten = require("flat").unflatten;
const fastcsv = require('fast-csv');

const featFunctions = require('./../features');

const measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action

const client = new Influx.InfluxDB({
    database: 'r_402_lamp_streams',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
});

var streams = {};
var features = {};
client.query('SELECT * FROM "r_402_lamp_streams"."autogen"."automaticNoActionSnapshot"').then((flatStreams) => {
    for (const flatStream of flatStreams) {
        for (const [key, value] of Object.entries(flatStream)) {
            if (value === null) {
                delete flatStream[key];
            }
          }
        // console.log(flatStream);
        delete flatStream["time"];
        var stream = unflatten(flatStream);
        // console.log(stream);
        var actionTimestamp = stream["actionTimestamp"];
        streams[actionTimestamp] = stream;
        features[actionTimestamp] = {};
        features[actionTimestamp]["label"] = stream["label"];
        features[actionTimestamp]["hours"] = stream["hours"];
        features[actionTimestamp]["minutes"] = stream["minutes"];
        features[actionTimestamp]["someonePresent"] = stream["someonePresent"];
        features[actionTimestamp]["sensorsNearBy"] = {};
        for (const [sensor, measurements] of Object.entries(stream["sensorsNearBy"])) {
            features[actionTimestamp]["sensorsNearBy"][sensor] = {};
            for (const [measurement, values] of Object.entries(measurements)) {
                // console.log(sensor + "-" + measurement + ": ", values["stream"][0]);
                var valuesStream = values["stream"][0];
                var timestampsStream = values["stream"][1];
                if (valuesStream.length !== 0) {
                    var index = indexOfAction(timestampsStream, actionTimestamp);   // index of the last measurement before the action was triggered
                    // console.log("Last measurement before action: " + valuesStream[index] + " at time: " + timestampsStream[index])
                    var valuesStream_right_before = valuesStream.slice(index - measurementsRightBeforeAction, index+1);     // most recent value is the last in the array
                    // console.log(valuesStream_right_before);
                    var valuesStream_old = valuesStream.slice(0, index - measurementsRightBeforeAction);    // most recent value is the last in the array
                    // console.log(valuesStream_old);
                    var norm_valuesStream = featFunctions.normalize(valuesStream);
                    var norm_values_right_before = norm_valuesStream.slice(index - measurementsRightBeforeAction, index+1);
                    var norm_values_old = norm_valuesStream.slice(0, index - measurementsRightBeforeAction);
                    
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement] = {};
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement]["lastMeasurementBeforeAction"] = valuesStream[index];
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement]["meanRightBefore"] = featFunctions.mean(valuesStream_right_before);
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement]["meanOld"] = featFunctions.mean(valuesStream_old);
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement]["stdev"] = featFunctions.stdev(norm_valuesStream);
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement]["maxVarRightBefore"] = featFunctions.maxVariation(norm_values_right_before);
                    features[actionTimestamp]["sensorsNearBy"][sensor][measurement]["maxVarOld"] = featFunctions.maxVariation(norm_values_old);
                }
            }
        }
    }
    // console.log(streams);
    // console.log(features);
    var dataset = [];
    for (const [actionTimestamp, snapshot] of Object.entries(features)) {
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
    }
    datasetName = "automaticNoActionSnapshot" + "_dataset.csv";
    fastcsv.writeToPath("./omnia/" + datasetName, dataset, {headers: true})
        .on('error', (err) => {
            console.log("Error while updating dataset", err);
        })
    
    function indexOfAction(timestampsStream, actionTimestamp) {
        var index = 0;
        for (const [i, time] of timestampsStream.entries()) {
            if (time < actionTimestamp) {
                index = i;
            }
        }
        return index;
    }
});
