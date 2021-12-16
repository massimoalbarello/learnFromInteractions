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
                for (const measurement of Object.keys(stream["sensorsNearBy"][sensor["id"]])) {
                    // if the stream of sensor values (first element of the stream array) is empty it means that the database was not reachable 
                    if (stream["sensorsNearBy"][sensor["id"]][measurement]["stream"][0].length == 0) {
                        return false;
                    }
                }
            }
            return true;
        }
    }
    return false;
}