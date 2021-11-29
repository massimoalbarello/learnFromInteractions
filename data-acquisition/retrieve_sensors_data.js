const parallel = require("run-parallel");
const flatten = require("flat").flatten;
const unflatten = require("flat").unflatten;

const influxQuery = require('../influx-db/query_data');
const influxWrite = require('../influx-db/write_data');
const buzzer = require("./../feedback/buzzer").Buzzer;

const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4



exports.retrieveData = async function(VPcandidate, triggerDevice, label, sensorsNearBy, noVPnearBy) {

    if (VPcandidate !== "") {
        var VPaddress = VPcandidate["address"];
        var VPdata = VPcandidate["data"];
        var btn0Timestamp = VPcandidate["timestamp"];
        var presence = 1;
    }
    else {
        var VPaddress = "automaticNoActionSnapshot"
        var VPdata = {};
        var btn0Timestamp = Date.now();
        if (noVPnearBy) {
            var presence = 0;
        }
        else {
            var presence = 1;
        }
    }
    
    console.log("\nGetting data from sensors...");

    var sensorsValues = {};
    // get data from sensors
    for (let sensor of sensorsNearBy) {
        sensorsValues[sensor["id"]] = {};
        for (let measurement of sensor["measurements"]) {
            sensorsValues[sensor["id"]][measurement]  = async function (parallelCb) {
                var res = await influxQuery.getStream(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 20", timestamp=btn0Timestamp);    // should use the timestamp of the trigger device instead of the thunderboard btn0
                // console.log(res);
                parallelCb(null, res);
            }
        };
    }
    parallel(flatten(sensorsValues), function (err, results) {
        if (err) {
            console.log("Error in parallel query: ", err);
            feedbackBuzzer.alarm()
        }
        else {
            sensorsValues = unflatten(results);    
            // console.log(sensorsValues);                
            storeStreams(sensorsValues, triggerDevice);
        }
    });



    function storeStreams(sensorsValues, triggerDevice) {

        var streams = initDatapoint(VPdata, btn0Timestamp, triggerDevice);
        for (const sensor of sensorsNearBy) {
            streams[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]] = {};
            for (var measurement of sensor["measurements"]) {
                var valuesStream = [];
                var timestampsStream = [];
                for (const value of sensorsValues[sensor["id"]][measurement]) {
                    valuesStream.push(value[measurement]);  // most recent value is the last in the array
                    timestampsStream.push(Date.parse(value["time"]));   // most recent timestamp is the last in the array
                }
                // console.log(measurement + ": " + valuesStream);
                if (valuesStream.length !== 0) {
                    streams[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                    streams[triggerDevice][btn0Timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stream"] = [valuesStream, timestampsStream];
                }
            }
        }
        streams[triggerDevice][btn0Timestamp]["someonePresent"] = presence;
        influxWrite.storeFlat("streams", triggerDevice, btn0Timestamp, streams[triggerDevice][btn0Timestamp]);
        console.log("Streams successfully stored on InfluxDB.");
    }

    function initDatapoint(VPdata, btn0Timestamp, triggerDevice) {
        var datapoint = {};
        datapoint[triggerDevice] = {};
        datapoint[triggerDevice][btn0Timestamp] = {};
        for (const VPmeasurement of Object.keys(VPdata)) {
            datapoint[triggerDevice][btn0Timestamp]["VP." + VPmeasurement] = VPdata[VPmeasurement];
        }
        datapoint[triggerDevice][btn0Timestamp]["hours"] = new Date(btn0Timestamp).getHours();
        datapoint[triggerDevice][btn0Timestamp]["minutes"] = new Date(btn0Timestamp).getMinutes();
        datapoint[triggerDevice][btn0Timestamp]["triggeredByVP"] = VPaddress;
        datapoint[triggerDevice][btn0Timestamp]["sensorsNearBy"] = {};
        datapoint[triggerDevice][btn0Timestamp]["label"] = label;  // set to 1 if the light was switched on by this action or to 0 if it was switched off

        return datapoint;
    }
}