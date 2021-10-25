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
    var max = values[0];
    var min = values[0];
    values.slice(1).forEach((value) => {
        if (value > max) {
            max = value;
        }
        if (value < min) {
            min = value;
        }
    });
    return (max - min) / max; 
}

module.exports.stdev = function(values) {
    return math.std(values);
}

module.exports.stream = function(values, timesteps) {
    return [values, timesteps];
}