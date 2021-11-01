const fs = require("fs")

const influx = require('../influx-db/query_data');
const featFunctions = require("./features");

const featFile = "./data-acquisition/features.json"

var oldFeatObj = fs.readFileSync(featFile, "utf-8");
var oldFeatJson = JSON.parse(oldFeatObj);

var countSensorsSnapshots = 0;
const measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action


exports.retrieveData = async function(address, timestamp, label, sensors, updateDataset) {
    console.log("\nGetting data from sensors...");
    var newFeatJson = await getFeatFromSensors(address, timestamp, oldFeatJson);
    // print newly acquired features
    var lastFeatures = newFeatJson[timestamp];
    console.log("\nFeatures of " + new Date(parseInt(timestamp)));
    Object.entries(lastFeatures["sensorsNearBy"]).forEach(sensor => {
        Object.entries(sensor[1]).forEach(measurement => {
            console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");
            Object.entries(measurement[1]).forEach(feat => {
                console.log(feat);
            })
        })
    })


    var newFeatObj = JSON.stringify(newFeatJson);
    fs.writeFile(featFile, newFeatObj, (err) => {
        if (err) {
            console.log("Error while writing file", err);
        }
        else {
            console.log("\nFeatures successfully written to file.")
        }
    })
    oldFeatJson = newFeatJson;
    countSensorsSnapshots = countSensorsSnapshots + 1;

    if (countSensorsSnapshots === 1) {
        updateDataset(newFeatJson);
        countSensorsSnapshots = 0;
    }

    async function getFeatFromSensors(address, timestamp, features) {
        var sensorsValues = {};
        features[timestamp] = {
            "hours": featFunctions.hours(timestamp),
            "minutes": featFunctions.minutes(timestamp),
            "triggeredBy": address,
            "sensorsNearBy": {},
            "label": label,  // set to 1 if the light was switched on by this action or to 0 if it was switched off
        };
        // get data and features from sensors

        // !!! should get data from the db in parallel so that we have to wait for "timeAfterAction" in query_data.js only once
        for (const sensor of sensors) {
            sensorsValues[sensor["id"]] = {};
            features[timestamp]["sensorsNearBy"][sensor["id"]] = {};
            for (var measurement of sensor["measurements"]) {
                sensorsValues[sensor["id"]][measurement]  = await influx.db(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 20", timestamp=timestamp);
                var val_array = [];
                var time_array = [];
                for (const value of sensorsValues[sensor["id"]][measurement]) {
                    val_array.push(value[measurement]);
                    time_array.push(Date.parse(value["time"]));
                }
                var index = indexOfAction(time_array, timestamp);   // index of the last measurement before the action was triggered
                // console.log("Last measurement before action: " + val_array[index] + " at time: " + time_array[index])
                var val_array_right_before = val_array.slice(index - measurementsRightBeforeAction, index+1);
                var val_array_old = val_array.slice(0, index - measurementsRightBeforeAction);
                var norm_val_array = featFunctions.normalize(val_array);
                var norm_values_right_before = norm_val_array.slice(index - measurementsRightBeforeAction, index+1);
                // console.log(norm_values_right_before);
                var norm_values_old = norm_val_array.slice(0, index - measurementsRightBeforeAction);
                // console.log(norm_values_old);
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                // features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stream"] = featFunctions.stream(val_array, time_array);
                // features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["normStream"] = featFunctions.stream(norm_val_array, time_array);
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["lastMeasurementBeforeAction"] = val_array[index];
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanRightBefore"] = featFunctions.mean(val_array_right_before);
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanOld"] = featFunctions.mean(val_array_old);
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stdev"] = featFunctions.stdev(norm_val_array);
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarRightBefore"] = featFunctions.maxVariation(norm_values_right_before);
                features[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarOld"] = featFunctions.maxVariation(norm_values_old);
            }
        }
        // console.log("\nFeatures update:\n", features[timestamp]);
        
        return features;
    }


    function indexOfAction(time_array, timestamp) {
        var index = 0;
        for (const [i, time] of time_array.entries()) {
            if (time < timestamp) {
                index = i;
            }
        }
        return index;
    }
}