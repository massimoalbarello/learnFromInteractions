const Influx = require("influx")

const validThreshold = 60;

exports.db = async function(measurement, sensor, limit, actionTimestamp) {
    const client = new Influx.InfluxDB({
        database: 'sensor_net',
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    })

    var query = createQuery(measurement, sensor, limit)

    var found = false;
    while (! found) {
        results = await findLastMeasurement()
        found = results[0];
        var lastValues = results[1];
        console.log("Found: ", found);
        console.log("Last values: ", lastValues);
    }

    function createQuery(measurement, sensor, limit) {
        return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor + ' ORDER BY time DESC ' + limit
    }

    function findLastMeasurement() {
        return new Promise(resolve => {
            setTimeout(() => {
                client.query(query).then((results) => {
                    console.log("\n" + measurement + " from: " + sensor)
                    var firstValidIndex = 0;
                    results.reverse().forEach((res) => {
                        var sensorTimestamp = Date.parse(res.time);
                        var timeElapsed = (actionTimestamp - sensorTimestamp) / 1000;
                        console.log("Value: " + res.light + " was detected: " + timeElapsed + " seconds before action");
                        if (timeElapsed < validThreshold && timeElapsed >= 0) {
                            resolve([true, results.slice(firstValidIndex)]);
                        }
                        else if (timeElapsed < 0) {
                            console.log("Missed measurement before action detected...")
                            resolve([true, results.slice(firstValidIndex)]);
                        }
                        firstValidIndex = firstValidIndex + 1;
                    });
                    resolve([false, []]);
                })
            }, 20000)
        })
    }
}