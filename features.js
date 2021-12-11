const math = require('mathjs');
const flatten = require("flat");
const sortByKeys = require('sort-object');

const settings = require('./settings');



const measurementsRightBeforeAction = settings.measurementsRightBeforeAction;

function standardize(values) {
    const mean = math.mean(values);
    const std = math.std(values);
    let std_values = [];
    if (std) {
        for (const value of values) {
            std_values.push((value - mean) / std);
        }
        return std_values;
    }
    else {
        return values;
    }
    
}

function normalize(values) {
    if (values.length > 0) {

    }
    const max = math.max(values);
    const min = math.min(values);
    let normalized_values = [];
    if (max !== min) {
        for (const value of values) {
            normalized_values.push((value - min) / (max - min));
        }
        return normalized_values;
    }
    else {
        return values;
    }
    
}

function mean(values) {
    if (values.length > 0) {
        return math.mean(values);
    }
    return null
}

function firstDerivs(values, timesteps) {
    // console.log(values);
    // console.log(timesteps);
    var val_diffs = values.slice(1).map((val,i) => val - values[i]);
    // console.log(val_diffs);
    var time_diffs = timesteps.slice(1).map((val,i) => (val - timesteps[i]) / 1000);
    // console.log(time_diffs);
    var first_derivs = math.dotDivide(val_diffs, time_diffs);
    // console.log(first_derivs);
    return first_derivs;
}

function maxVariation(values) {
    if (values.length > 0) {
        var max = math.max(values);
        var min = math.min(values);
        return (max - min);
    }
    return null
}

function stdev(values) {
    if (values.length > 0) {
        return math.std(values);
    }
    return null
}

function stream(values, timesteps) {
    return [values, timesteps];
}

exports.computeFeatures = function(featuresObj, actionTimestamp, stream) {
    featuresObj[actionTimestamp] = {};
    featuresObj[actionTimestamp]["label"] = stream["label"];
    featuresObj[actionTimestamp]["hours"] = stream["hours"];
    featuresObj[actionTimestamp]["minutes"] = stream["minutes"];
    featuresObj[actionTimestamp]["someonePresent"] = stream["someonePresent"];
    var VPdata = stream["VP"];
    if (VPdata !== undefined) {
        for (const VPmeasurement of Object.keys(VPdata)) {
            featuresObj[actionTimestamp]["VP." + VPmeasurement] = VPdata[VPmeasurement];
        }
    }
    featuresObj[actionTimestamp]["sensorsNearBy"] = {};
    for (const [sensor, measurements] of Object.entries(stream["sensorsNearBy"])) {
        featuresObj[actionTimestamp]["sensorsNearBy"][sensor] = {};
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
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement] = {};
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement]["lastMeasurementBeforeAction"] = valuesStream[index];
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement]["meanRightBefore"] = mean(valuesStream_right_before);
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement]["meanOld"] = mean(valuesStream_old);
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement]["stdev"] = stdev(valuesStream);
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement]["maxVarRightBefore"] = maxVariation(valuesStream_right_before);
                featuresObj[actionTimestamp]["sensorsNearBy"][sensor][measurement]["maxVarOld"] = maxVariation(valuesStream_old);
            }
        }
    }
    return featuresObj;
}

function indexOfAction(timestampsStream, actionTimestamp) {
    var index = 0;
    for (const [i, time] of timestampsStream.entries()) {
        if (time < actionTimestamp) {
            index = i;
        }
    }
    return index;
}



exports.createDataset = function(featuresObj, training) {
    var features_list = [];
    var labels_list = [];
    for (const [actionTimestamp, snapshot] of Object.entries(featuresObj)) {
        var flatSnapshot = flatten(snapshot);
        // ignoring data from the VP
        delete flatSnapshot["VP.humidity"];
        delete flatSnapshot["VP.lux"];
        delete flatSnapshot["VP.temperature"];
        if (Object.keys(flatSnapshot).length == 76) {
            // dataset should not have values that are not numbers
            for (const [key, value] of Object.entries(flatSnapshot)) {
                if (typeof(value) !== "number") {
                    if (training) {
                        flatSnapshot[key] = null;   // should be imputed later by considering the other values in the dataset
                    }
                    else {
                        flatSnapshot[key] = 0;  // will not be imputed as it is the snapshot used for the prediction
                    }
                } 
            }
            sortedFlatSnapshot = sortByKeys(flatSnapshot);
            // console.log(sortedFlatSnapshot);
            labels_list.push(sortedFlatSnapshot["label"]);
            delete sortedFlatSnapshot["label"];
            features_list.push(Object.values(sortedFlatSnapshot));
        }
        else {
            // console.log("Discarding: ", flatSnapshot);
            console.log("Discarding datapoint without some features");
        }
        
    }
    return [features_list, labels_list];
}

