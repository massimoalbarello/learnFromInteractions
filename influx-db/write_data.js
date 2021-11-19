const Influx = require("influx");
const flatten = require("flat");



exports.storeFlat = function(dataType, triggerDevice, actionTimestamp, dataJson) {

    const client = new Influx.InfluxDB({
        database: triggerDevice + "_" + dataType,
        host: 'interactions.ics.unisg.ch',
        port: 8086,
        username: 'admin',
        password: 'inthrustwetrust',
    });

    const VPaddress = dataJson["triggeredByVP"];
    delete dataJson["triggeredByVP"];   // cannot store string values in InfluxDB
    dataJson["actionTimestamp"] = actionTimestamp;
    const flatDataJson = flatten(dataJson);

    client.writePoints([
        {
            measurement: VPaddress,
            fields: flatDataJson,
        }
    ]);
}