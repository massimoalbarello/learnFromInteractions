const settings = require('./../settings');

const sensorsNearBy = settings.sensorsNearBy;

exports.streamIsCorrect = function(stream) {
    if (stream.hasOwnProperty("sensorsNearBy")) {
        if (Object.keys(stream["sensorsNearBy"]).length == sensorsNearBy.length) {
            for (const sensor of sensorsNearBy) {
                // check if stream is missing data from some sensors near by
                if (!Object.keys(stream["sensorsNearBy"]).includes(sensor["id"])) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}