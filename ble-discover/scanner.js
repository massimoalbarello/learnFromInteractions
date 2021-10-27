const noble = require('@abandonware/noble');
const influx = require('../influx-db/query_data');
const fs = require("fs")
const gpio = require("gpio");
const statFunctions = require("./statistics");

const statFile = "./statistics.json"

var oldStatObj = fs.readFileSync(statFile, "utf-8");
var oldStatJson = JSON.parse(oldStatObj);

exports.scan = function(sensors, updateVPhistory, updateDataset) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var countVPsnapshot = 0;
    var countSensorsSnapshots = 0;

    const thresh = -100;   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID
    const measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action

    var gpio4 = gpio.export(4, {
        direction: gpio.DIRECTION.OUT,
        ready: function() {
            // console.log("GPIO 4 set up for output");
        }
    });
    gpio4.reset();
    
    

    noble.startScanning(servicesUUID, true);    // allow multiple broadcasts from the same device



    noble.on('discover', async (peripheral) => {
        
        var data = peripheral.advertisement.manufacturerData;
        var address = peripheral.address;
        var timestamp = Date.now()

        if (isVP(data, manufacturerId)) {
            // console.log("\nPower level:", peripheral.rssi)
            if (isNearBy(peripheral.rssi, thresh)) {
                updateLocalVPsnapshots(data, address, timestamp);
                countVPsnapshot = countVPsnapshot + 1;
                if (countVPsnapshot === 30){
                    countVPsnapshot = 0;
                    // console.log("\nUpdating history...")
                    updateVPhistory({...VPsnapshotsUpdate});
                    VPsnapshotsUpdate = {};
                }
            }
            else {
                vpIsAway(address)
            }
        }
    });

        
    function vpIsAway(address) {
        // console.log("\n[" + address + "]: VP not in this room.")
    }



    function updateLocalVPsnapshots(data, address, timestamp) {
        if (isRegistered(address)) {
            addSnapshot(data, address, timestamp);
        }
        else {
            VPsnapshotsUpdate[address] = {};
            addSnapshot(data, address, timestamp);
        }
    }

    function addSnapshot(data, address, timestamp) {
        VPsnapshotsUpdate[address][timestamp] = vpSnapshot(data, address, timestamp);
    }

    async function vpSnapshot(data, address, timestamp) {
        // console.log("\n[" + address + "]: received new data.");

        if (data.readUInt16LE(10) === 1) {
            var newStatJson = await getStatsFromSensors(address, timestamp, oldStatJson);

            var lastStatistics = newStatJson[timestamp];
            console.log("\nStatistics of " + new Date(parseInt(timestamp)));
            Object.entries(lastStatistics["sensorsNearBy"]).forEach(sensor => {
                Object.entries(sensor[1]).forEach(measurement => {
                    console.log("\n{" + sensor[0] + "} [" + measurement[0] + "]");
                    Object.entries(measurement[1]).forEach(stat => {
                        console.log(stat);
                    })
                })
            })


            var newStatObj = JSON.stringify(newStatJson);
            fs.writeFile(statFile, newStatObj, (err) => {
                if (err) {
                    console.log("Error while writing file", err);
                }
                else {
                    console.log("\nStatistics successfully written to file.")
                }
            })
            oldStatJson = newStatJson;
            countSensorsSnapshots = countSensorsSnapshots + 1;

            if (countSensorsSnapshots === 3) {
                updateDataset(newStatJson);
                countSensorsSnapshots = 0;
            }
        }

        const snapshot = {
            "temperature": data.readInt16LE(2),
            "humidity": data.readUInt16LE(4),
            "lux": data.readUInt16LE(6),
            // "uvi": data.readUInt16LE(8),
            "hall": data.readUInt16LE(10),
            // "sound": data.readUInt16LE(12),
            // "pressure": data.readUInt16LE(14),
            // "co2": data.readUInt16LE(16),
            // "tvoc": data.readUInt16LE(18),
            // "battery": data.readUInt8(20),
            // "id": data.readUInt8(21),
        };
        // console.log(snapshot);

        return snapshot;
    }

    async function getStatsFromSensors(address, timestamp, statistics) {
        console.log("\n[" + address + "]: about to do an action!");
        gpio4.set();
        setTimeout(() => gpio4.reset(), 1000);
        var sensorsValues = {};
        statistics[timestamp] = {
            "triggeredBy": address,
            "sensorsNearBy": {},
            "label": 1,  // set to 1 if the light was switched on by this action or to 0 if it was switched off

        };
        // get data and statistics from sensors

        // !!! should get data from the db in parallel so that we have to wait for "timeAfterAction" in query_data.js only once
        for (const sensor of sensors) {
            sensorsValues[sensor["id"]] = {};
            statistics[timestamp]["sensorsNearBy"][sensor["id"]] = {};
            for (var measurement of sensor["measurements"]) {
                sensorsValues[sensor["id"]][measurement]  = await influx.db(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 20", timestamp=timestamp);
                var val_array = [];
                var time_array = [];
                for (const value of sensorsValues[sensor["id"]][measurement]) {
                    val_array.push(value[measurement]);
                    time_array.push(Date.parse(value["time"]));
                }
                var index = indexOfAction(time_array, timestamp);   // index of the last measurement before the action was triggered
                // console.log("Last measurement before action: " + val_array[index] + " at time: " + time_array[index])
                var val_array_right_before = val_array.slice(index - measurementsRightBeforeAction, index+1);
                var val_array_old = val_array.slice(0, index - measurementsRightBeforeAction);
                var norm_val_array = statFunctions.normalize(val_array);
                var norm_values_right_before = norm_val_array.slice(index - measurementsRightBeforeAction, index+1);
                // console.log(norm_values_right_before);
                var norm_values_old = norm_val_array.slice(0, index - measurementsRightBeforeAction);
                // console.log(norm_values_old);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                // statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stream"] = statFunctions.stream(val_array, time_array);
                // statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["normStream"] = statFunctions.stream(norm_val_array, time_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["lastMeasurementBeforeAction"] = val_array[index];
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanRightBefore"] = statFunctions.mean(val_array_right_before);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["meanOld"] = statFunctions.mean(val_array_old);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stdev"] = statFunctions.stdev(norm_val_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarRightBefore"] = statFunctions.maxVariation(norm_values_right_before);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVarOld"] = statFunctions.maxVariation(norm_values_old);
            }
        }
        // console.log("\nStatistics update:\n", statistics[timestamp]);
        
        return statistics;
    }


    function indexOfAction(time_array, timestamp) {
        var index = 0;
        for (const [i, time] of time_array.entries()) {
            if (time < timestamp) {
                index = i;
            }
        }
        return index;
    }


    function isVP(data) {
        return data && data.slice(0, 2).toString("hex") == manufacturerId
    }

    function isNearBy(rssi) {
        return rssi > thresh
    }

    function isRegistered(address) {
        return VPsnapshotsUpdate.hasOwnProperty(address)
    }

}