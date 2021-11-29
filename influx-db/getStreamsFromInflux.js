const Influx = require("influx")
const unflatten = require("flat").unflatten;

const client = new Influx.InfluxDB({
    database: 'r_402_lamp_streams',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
});

client.query('SELECT * FROM "r_402_lamp_streams"."autogen"."automaticNoActionSnapshot"').then((flatStreams) => {
    for (const flatStream of flatStreams) {
        for (const [key, value] of Object.entries(flatStream)) {
            if (value === null) {
                delete flatStream[key];
            }
          }
        // console.log(flatStream);
        delete flatStream["time"];

        var stream = unflatten(flatStream);
        console.log(stream);
    }
    // make sure to remove the "null" from the array of each measurement
});