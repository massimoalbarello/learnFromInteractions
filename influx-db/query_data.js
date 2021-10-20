const Influx = require("influx")

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
        found = await findLastMeasurement()
        console.log("Found: ", found);
    }

    function createQuery(measurement, sensor, limit) {
        return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor + ' ORDER BY time DESC ' + limit
    }

    function findLastMeasurement() {
        return new Promise(resolve => {
            setTimeout(() => {
                client.query(query).then((results) => {
                    console.log("Action timestamp: ", actionTimestamp)
                    console.log("\n" + measurement + " from: " + sensor)
                    results.reverse().forEach((res) => {
                        var sensorTimestamp = Date.parse(res.time);
                        var timeElapsed = (actionTimestamp - sensorTimestamp) / 1000;
                        console.log("Value: " + res.light + " was detected: " + timeElapsed + " seconds before action");
                        if (timeElapsed < 20 && timeElapsed >= 0) {
                            resolve(true);
                        }
                        else if (timeElapsed < 0) {
                            console.log("Missed measurement before action detected...")
                            resolve(true);
                        }
                    });
                    resolve(false);
                })
            }, 5000)
        })
    }
}