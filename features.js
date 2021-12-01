const math = require('mathjs');

module.exports.standardize = function (values) {
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

module.exports.normalize = function (values) {
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

module.exports.mean = function (values) {
    if (values.length > 0) {
        return math.mean(values);
    }
    return null
}

module.exports.firstDerivs = function(values, timesteps) {
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

module.exports.maxVariation = function(values) {
    if (values.length > 0) {
        var max = math.max(values);
        var min = math.min(values);
        return (max - min);
    }
    return null
}

module.exports.stdev = function(values) {
    if (values.length > 0) {
        return math.std(values);
    }
    return null
}

module.exports.stream = function(values, timesteps) {
    return [values, timesteps];
}

module.exports.hours = function(timestamp) {
    let date = new Date(timestamp);
    let hours = date.getHours(); 
    return hours;
}

module.exports.minutes = function(timestamp) {
    let date = new Date(timestamp);
    let minutes = date.getMinutes(); 
    return minutes;
}