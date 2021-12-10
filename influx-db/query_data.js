const Influx = require("influx");

const settings = require("./../settings");
const buzzer = require("./../feedback/buzzer").Buzzer;



const room = settings.room;
const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4



const sensorNet = new Influx.InfluxDB({
    database: 'sensor_net',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
});

exports.getStream = async function(measurement, sensor_id, queryLimit, actionTimestamp) {

    var query = createQuery(measurement, sensor_id, queryLimit)
    
    return new Promise(resolve => {
        
        sensorNet.query(query)
            .then((results) => {
                if (results.length === 0) {
                    results = [];
                }
                // console.log("\n[" + sensor_id + "]: Last values: ", results);
                resolve(results);
            })
            .catch((err) => {
                console.log("Couldn't get sensor data from InfluxDB: ", err);
                feedbackBuzzer.alarm()
                resolve([])
            });
    })

    function createQuery(measurement, sensor_id, queryLimit) {
        return 'SELECT ' + measurement + ' FROM "sensor_net"."autogen".' + sensor_id + ' WHERE time > now() - 20m ' + queryLimit
    }
}

exports.getLampState = async function() {

    return new Promise(resolve => {
        sensorNet.query('SELECT "' + room + '" FROM "sensor_net"."autogen"."room_lamp_status" ORDER BY time DESC limit 1')
            .then((result) => {
                resolve(result[0][room]);
            })
            .catch((err) => {
                console.log("Couldn't get lamp state from InfluxDB: ", err);
                feedbackBuzzer.alarm();
                resolve("");
            });
    });
}

exports.getPredictions = async function(databaseName, queryLimit) {
        
    const predictionsDB = new Influx.InfluxDB({
        database: databaseName,
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    });

    return new Promise((resolve) => {
        predictionsDB.query('SELECT "correctState", "prediction", "actionTimestamp" FROM ' + databaseName + '."autogen"."prediction-correctState" ' + queryLimit)
        .then((results) => {
            var predictions = [];
            var correctStates = [];
            var predictionTimestamps = [];
            for (const result of results) {
                delete result["time"];
                predictions.push(result["prediction"]);
                correctStates.push(result["correctState"])
                predictionTimestamps.push(result["actionTimestamp"]);
            }
            resolve([predictions, correctStates, predictionTimestamps]);

        })
        .catch((err) => {
            console.log("Couldn't get predictions from InfluxDB: ", err);
            feedbackBuzzer.alarm();
        });
    })
}