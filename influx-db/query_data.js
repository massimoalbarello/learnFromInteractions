const Influx = require("influx");

const settings = require("./../settings");
const buzzer = require("./../feedback/buzzer").Buzzer;


const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4



exports.getStream = async function(measurement, sensor_id, queryLimit, actionTimestamp) {
        
    const client = new Influx.InfluxDB({
        database: 'sensor_net',
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    });

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

exports.getLampState = async function() {
    
    const client = new Influx.InfluxDB({
        database: 'knxbucket',
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    });

    return new Promise(resolve => {
        client.query('SELECT ' + lamp + ' FROM "knxbucket"."autogen"."bucket" ORDER BY time DESC limit 1')
            .then((result) => {
                resolve(result);
            })
            .catch((err) => {
                console.log("Couldn't reach InfluxDB: ", err);
                feedbackBuzzer.alarm();
                resolve("");
            });
    });
}