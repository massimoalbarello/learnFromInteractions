const { Measurement } = require("influx")
const Influx = require("influx")

const client = new Influx.InfluxDB({
    database: 'sensor_net',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
  })

var measurement = "light";
var sensor = "thunderboard_086bd7fe1054";
var limit = " LIMIT 10";
var query = createQuery(measurement, sensor, limit)

client.query(query).then(results => {
    results.forEach((res) => {
        console.log("Value: " + res.light + " at: " + res.time);
    });
})

function createQuery(measurement, sensor, limit) {
    return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor + ' ORDER BY time DESC ' + limit
}