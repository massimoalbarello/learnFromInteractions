const noble = require('@abandonware/noble');
const influx = require('../influx-db/query_data');
const fs = require("fs")
const gpio = require("gpio");
const statFunctions = require("./statistics");

const statFile = "./statistics.json"

var oldStatObj = fs.readFileSync(statFile, "utf-8");
var oldStatJson = JSON.parse(oldStatObj);

exports.scan = function(sensors, updateVPhistory) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var count = 0;

    const thresh = -100   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID

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
                count = count + 1;
                if (count === 30){
                    count = 0;
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
            var newStatJson = await listenForAction(address, timestamp, oldStatJson);
            // console.log("\nStatistics log:\n", newStatJson);
            // Object.keys(newStatJson[timestamp]).forEach(sensor => {
            //     Object.keys(newStatJson[timestamp][sensor]).forEach(measurement => {
            //         console.log("\n[" + sensor + "]: variations of '" + measurement + "': " + newStatJson[timestamp][sensor][measurement]["firstDerivs"]);
            //         console.log("\n[" + sensor + "]: stream of '" + measurement + "': \n" + newStatJson[timestamp][sensor][measurement]["stream"][0] + "\n" + newStatJson[timestamp][sensor][measurement]["stream"][1])
            //     })
            // })
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

    async function listenForAction(address, timestamp, statistics) {
        console.log("\n[" + address + "]: about to do an action!");
        gpio4.set();
        setTimeout(() => gpio4.reset(), 1000);
        var sensorsValues = {};
        statistics[timestamp] = {
            "triggeredBy": address,
            "sensorsNearBy": {}
        };
        // start recording data from sensors and check which device the user will interact with
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
                var std_val_array = statFunctions.standardize(val_array);
                // console.log(std_val_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement] = {};
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stream"] = statFunctions.stream(val_array, time_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["firstDerivs"] = statFunctions.firstDerivs(std_val_array, time_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["maxVariation"] = statFunctions.maxVariation(std_val_array);
                statistics[timestamp]["sensorsNearBy"][sensor["id"]][measurement]["stdev"] = statFunctions.stdev(val_array);
            }
        }
        console.log("\nStatistics update:\n", statistics[timestamp]);

        return statistics;
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