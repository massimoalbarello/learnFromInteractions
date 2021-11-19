const Influx = require("influx")

const validThreshold = 1000;    // time in seconds of the earliest valid measurement from the action
const timeAfterAction = 5000;   // time in milliseconds to wait after the action is detected

const client = new Influx.InfluxDB({
    database: 'sensor_net',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
})

exports.getStream = async function(measurement, sensor_id, queryLimit, actionTimestamp) {

    var query = createQuery(measurement, sensor_id, queryLimit)

    var found = false;
    while (! found) {
        results = await findLastMeasurements()
        found = results[0];
        var lastValues = results[1];
        // console.log("[" + sensor_id + "]: Found: ", found);
    }

    // console.log("\n[" + sensor_id + "]: Last values: ", lastValues);
    return lastValues;



    function createQuery(measurement, sensor_id, queryLimit) {
        return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor_id + ' ORDER BY time DESC ' + queryLimit
    }

    function findLastMeasurements() {
        return new Promise(resolve => {
            // console.log("\nWaiting for data up to " + timeAfterAction/1000 + " seconds after action...")
            setTimeout(() => {
                client.query(query).then((results) => {
                    // console.log("\n[" + sensor_id + "]: " + measurement)
                    var firstValidIndex = 0;
                    results.reverse().forEach((res) => {
                        var sensorTimestamp = Date.parse(res.time);
                        var timeElapsed = (actionTimestamp - sensorTimestamp) / 1000;
                        // console.log("{" + sensor_id + "} [" + measurement + "]: " + res[measurement] + " was detected: " + timeElapsed + " seconds before action");
                        if (timeElapsed < validThreshold && timeElapsed >= 0) {
                            resolve([true, results.slice(firstValidIndex)]);
                        }
                        else if (timeElapsed < 0) {
                            // console.log("\n{" + sensor_id + "} [" + measurement + "]: Missed measurement before action detected...")
                            resolve([true, results.slice(firstValidIndex)]);
                        }
                        firstValidIndex = firstValidIndex + 1;
                    });
                    resolve([false, []]);
                })
            }, timeAfterAction)
        })
    }
}