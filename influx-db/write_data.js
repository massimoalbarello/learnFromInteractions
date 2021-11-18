const Influx = require("influx");
const flatten = require("flat");



exports.storeFeatures = function(triggerDevice, snapshot) {

    const client = new Influx.InfluxDB({
        database: triggerDevice + "_snapshots",
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    });

    const VPaddress = snapshot["triggeredByVP"];
    delete snapshot["triggeredByVP"];
    const flatSnapshot = flatten(snapshot);

    client.writePoints([
        {
            measurement: VPaddress,
            fields: flatSnapshot,
        }
    ])
    console.log("\nFeatures successfully stored on InfluxDB");
}