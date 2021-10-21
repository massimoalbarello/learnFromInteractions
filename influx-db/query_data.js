const Influx = require("influx")

const validThreshold = 1000;
const timeAfterAction = 5000;

exports.db = async function(measurement, sensor_id, limit, actionTimestamp) {
    const client = new Influx.InfluxDB({
        database: 'sensor_net',
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    })

    var query = createQuery(measurement, sensor_id, limit)

    var found = false;
    while (! found) {
        results = await findLastMeasurement()
        found = results[0];
        var lastValues = results[1];
        // console.log("[" + sensor_id + "]: Found: ", found);
    }

    // console.log("\n[" + sensor_id + "]: Last values: ", lastValues);
    return lastValues;



    function createQuery(measurement, sensor_id, limit) {
        return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor_id + ' ORDER BY time DESC ' + limit
    }

    function findLastMeasurement() {
        return new Promise(resolve => {
            setTimeout(() => {
                client.query(query).then((results) => {
                    // console.log("\n[" + sensor_id + "]: " + measurement)
                    var firstValidIndex = 0;
                    results.reverse().forEach((res) => {
                        var sensorTimestamp = Date.parse(res.time);
                        var timeElapsed = (actionTimestamp - sensorTimestamp) / 1000;
                        // console.log("[" + sensor_id + "]: " + res[measurement] + " was detected: " + timeElapsed + " seconds before action");
                        if (timeElapsed < validThreshold && timeElapsed >= 0) {
                            resolve([true, results.slice(firstValidIndex)]);
                        }
                        else if (timeElapsed < 0) {
                            // console.log("\n[" + sensor_id + "]: Missed measurement before action detected...")
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