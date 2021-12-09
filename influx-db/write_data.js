const Influx = require("influx");
const flatten = require("flat");



exports.storeFlat = function(databaseName, actionTimestamp, dataJson) {

    const client = new Influx.InfluxDB({
        database: databaseName,
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    });

    const VPaddress = dataJson["triggeredByVP"];
    delete dataJson["triggeredByVP"];   // cannot store string values in InfluxDB
    dataJson["actionTimestamp"] = actionTimestamp;
    const flatDataJson = flatten(dataJson);

    // influxDB cannot store values that are not numbers
    for (const [key, value] of Object.entries(flatDataJson)) {
        if (typeof(value) !== "number") {
            delete flatDataJson[key];
        } 
    }
    // console.log(flatDataJson);

    client.writePoints([
        {
            measurement: VPaddress,
            fields: flatDataJson,
        }
    ]);
}