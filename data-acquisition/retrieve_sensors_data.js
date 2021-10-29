const fs = require("fs")

const influx = require('../influx-db/query_data');
const statFunctions = require("./statistics");

const statFile = "./data-acquisition/statistics.json"

var oldStatObj = fs.readFileSync(statFile, "utf-8");
var oldStatJson = JSON.parse(oldStatObj);

var countSensorsSnapshots = 0;
const measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action


exports.retrieveData = async function(address, timestamp, label, sensors, updateDataset) {
    console.log("\nGetting data from sensors...");
    var newStatJson = await getStatsFromSensors(address, timestamp, oldStatJson);
    // print newly acquired statistics
    var lastStatistics = newStatJson[timestamp];
    console.log("\nStatistics of " + new Date(parseInt(timestamp)));
    Object.entries(lastStatistics["sensorsNearBy"]).forEach(sensor => {
        Object.entries(sensor[1]).forEach(measurement => {
            console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");
            Object.entries(measurement[1]).forEach(stat => {
                console.log(stat);
            })
        })
    })


    var newStatObj = JSON.stringify(newStatJson);
    fs.writeFile(statFile, newStatObj, (err) => {
        if (err) {
            console.log("Error while writing file", err);
        }
        else {
            console.log("\nStatistics successfully written to file.")
        }
    })
    oldStatJson = newStatJson;
    countSensorsSnapshots = countSensorsSnapshots + 1;

    if (countSensorsSnapshots === 1) {
        updateDataset(newStatJson);
        countSensorsSnapshots = 0;
    }

    async function getStatsFromSensors(address, timestamp, statistics) {
        var sensorsValues = {};
        statistics[timestamp] = {
            "triggeredBy": address,
            "sensorsNearBy": {},
            "label": label,  // set to 1 if the light was switched on by this action or to 0 if it was switched off
        };
        // get data and statistics from sensors

        // !!! should get data from the db in parallel so that we have to wait for "timeAfterAction" in query_data.js only once
        for (const sensor of sensors) {
            sensorsValues[sensor["id"]] = {};
            statistics[timestamp]["sensorsNearBy"][sensor["id"]] = {};
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
                var norm_val_array = statFunctions.normalize(val_array);
                var norm_values_right_before = norm_val_array.slice(index - measurementsRightBeforeAction, index+1);
                // console.log(norm_values_right_before);
                var norm_values_old = norm_val_array.slice(0, index - measurementsRightBeforeAction);
                // console.log(norm_values_old);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                // statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stream"] = statFunctions.stream(val_array, time_array);
                // statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["normStream"] = statFunctions.stream(norm_val_array, time_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["lastMeasurementBeforeAction"] = val_array[index];
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanRightBefore"] = statFunctions.mean(val_array_right_before);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanOld"] = statFunctions.mean(val_array_old);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stdev"] = statFunctions.stdev(norm_val_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarRightBefore"] = statFunctions.maxVariation(norm_values_right_before);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarOld"] = statFunctions.maxVariation(norm_values_old);
            }
        }
        // console.log("\nStatistics update:\n", statistics[timestamp]);
        
        return statistics;
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