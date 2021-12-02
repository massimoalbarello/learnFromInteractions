const Influx = require("influx");
const unflatten = require("flat").unflatten;
const fastcsv = require('fast-csv');

const featFunctions = require('./../features');
const settings = require('./../settings');

const databaseName = settings.databaseName;

const client = new Influx.InfluxDB({
    database: databaseName,
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
});

var streams = {};
var features = {};
client.getMeasurements().then(async (snapshotActivators) => {
    for (var snapshotActivator of snapshotActivators) {
        // console.log("\n" + snapshotActivator)
        var flatStreams = await client.query('SELECT * FROM ' + databaseName + '."autogen"."' + snapshotActivator + '"')
        for (const flatStream of flatStreams) {
            for (const [key, value] of Object.entries(flatStream)) {
                if (value === null) {
                    delete flatStream[key];
                }
            }
            // console.log(flatStream);
            delete flatStream["time"];
            var stream = unflatten(flatStream);
            // console.log(stream);
            var actionTimestamp = stream["actionTimestamp"];
            streams[actionTimestamp] = stream;
            features = featFunctions.computeFeatures(features, actionTimestamp, stream);
        }
        // console.log(streams);
        // console.log(features);
        const dataset = featFunctions.createDataset(features, training=true);
        const datasetName = "dataset.csv";
        fastcsv.writeToPath("./omnia/" + datasetName, dataset, {headers: true})
            .on('error', (err) => {
                console.log("Error while updating dataset", err);
            })
    }    
})
