const Influx = require("influx")
const buzzer = require("./../feedback/buzzer").Buzzer;



const client = new Influx.InfluxDB({
    database: 'sensor_net',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
})

const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4



exports.getStream = async function(measurement, sensor_id, queryLimit, actionTimestamp) {

    var query = createQuery(measurement, sensor_id, queryLimit)
    
    return new Promise(resolve => {
        
        client.query(query)
            .then((results) => {
                if (results.length === 0) {
                    results = [];
                }
                // console.log("\n[" + sensor_id + "]: Last values: ", results);
                resolve(results);
            })
            .catch((err) => {
                console.log("Couldn't reach InfluxDB: ", err);
                feedbackBuzzer.alarm()
                resolve([])
            });
    })

    function createQuery(measurement, sensor_id, queryLimit) {
        return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor_id + ' WHERE time > now() - 20m ' + queryLimit
    }
}