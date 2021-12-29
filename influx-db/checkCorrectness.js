const settings = require('./../settings');

const sensorsNearBy = settings.sensorsNearBy;

exports.streamIsCorrect = function(stream) {
    if (stream.hasOwnProperty("sensorsNearBy")) {
        for (const sensor of sensorsNearBy) {
            // check if stream is missing data from some sensors near by
            if (!Object.keys(stream["sensorsNearBy"]).includes(sensor["id"])) {
                console.log("\nMissing sensor: [" + sensor["id"] + "]");
                return false;
            }
            for (const measurement of sensor["measurements"]) {
                if (!Object.keys(stream["sensorsNearBy"][sensor["id"]]).includes(measurement)) {
                    console.log("\nMissing measurement: [" + sensor["id"] + ": " + measurement + "]");
                    return false;
                }
                // if the stream of sensor values (first element of the stream array) is empty it means that the database was not reachable 
                if (stream["sensorsNearBy"][sensor["id"]][measurement]["stream"][0].length == 0) {
                    console.log("\nMeasurement with no values: ");
                    return false;
                }
            }
        }
        return true;
    }
    console.log("\nMissing sensorsNearBy property");
    return false;
}