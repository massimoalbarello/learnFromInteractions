const Influx = require("influx");
const unflatten = require("flat").unflatten;
const fastcsv = require('fast-csv');

const featFunctions = require('./../features');
const settings = require('./../settings');

const streamsDBname = settings.streamsDBname;

const client = new Influx.InfluxDB({
    database: streamsDBname,
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
});


exports.getDataset = function() {
    var streamsObj = {};
    var featuresObj = {};
    return new Promise((resolve) => {
        client.getMeasurements().then(async (snapshotActivators) => {
            for (var snapshotActivator of snapshotActivators) {
                // console.log("\n" + snapshotActivator)
                var flatStreamsObj = await client.query('SELECT * FROM ' + streamsDBname + '."autogen"."' + snapshotActivator + '"')
                for (const flatStream of flatStreamsObj) {
                    for (const [key, value] of Object.entries(flatStream)) {
                        if (value === null) {
                            delete flatStream[key];
                        }
                    }
                    // console.log(flatStream);
                    delete flatStream["time"];  // remove time field automatically added when querying from influxDB
                    var stream = unflatten(flatStream);
                    // console.log(stream);
                    var actionTimestamp = stream["actionTimestamp"];
                    streamsObj[actionTimestamp] = stream;
                    featuresObj = featFunctions.computeFeatures(featuresObj, actionTimestamp, stream);
                }
            }   
            // console.log(streamsObj);
            // console.log(featuresObj);
            const [features_list, labels_list] = featFunctions.createDataset(featuresObj, training=true);
            // console.log(features_list);
            // console.log(labels_list);
            resolve([features_list, labels_list]);
        })
    })
}

