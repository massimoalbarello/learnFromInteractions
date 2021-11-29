const Influx = require("influx")
const unflatten = require("flat").unflatten;

const client = new Influx.InfluxDB({
    database: 'r_402_lamp_streams',
    host: 'interactions.ics.unisg.ch',
    port: 8086,
    username: 'admin',
    password: 'inthrustwetrust',
});

client.query('SELECT * FROM "r_402_lamp_streams"."autogen"."14:b4:57:6d:a5:43" ORDER BY time DESC LIMIT 1').then((flatBackupStream) => {
    delete flatBackupStream["groupsTagsKeys"];
    delete flatBackupStream["groupRows"];
    delete flatBackupStream["group"];
    delete flatBackupStream["groups"];
    delete flatBackupStream[0]["time"];

    var backupStream = unflatten(flatBackupStream[0]);
    console.log(backupStream);

    // make sure to remove the "null" from the array of each measurement
});