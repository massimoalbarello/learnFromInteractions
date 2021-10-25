const noble = require('@abandonware/noble');
const influx = require('../influx-db/query_data');
const math = require('mathjs');
const fs = require("fs")

const statFile = "./statistics.json"

exports.scan = function(sensorsNearBy, updateVPhistory) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var count = 0;

    const thresh = -100   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID
    


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
            var statistics = await listenForAction(address, timestamp);
            console.log("\n", statistics);
            // Object.keys(statistics).forEach(sensor => {
            //     Object.keys(statistics[sensor]).forEach(measurement => {
            //         console.log("\n[" + sensor + "]: variations of '" + measurement + "': " + statistics[sensor][measurement]["firstDerivs"]);
            //         console.log("\n[" + sensor + "]: stream of '" + measurement + "': \n" + statistics[sensor][measurement]["stream"][0] + "\n" + statistics[sensor][measurement]["stream"][1])
            //     })
            // }
            var statObj = JSON.stringify(statistics);
            fs.writeFile(statFile, statObj, (err) => {
                if (err) {
                    console.log("Error while writing file", err);
                }
                else {
                    console.log("\nStatistics written successfully to file.")
                }
            })
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

    async function listenForAction(address, timestamp) {
        console.log("\n[" + address + "]: about to do an action!");
        var sensorsValues = {};
        var statistics = {};
        // start recording data from sensors and check which device the user will interact with
        for (const sensor of sensorsNearBy) {
            sensorsValues[sensor["id"]] = {};
            statistics[sensor["id"]] = {};
            for (var measurement of sensor["measurements"]) {
                sensorsValues[sensor["id"]][measurement]  = await influx.db(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 20", timestamp=timestamp);
                var val_array = [];
                var time_array = [];
                for (const value of sensorsValues[sensor["id"]][measurement]) {
                    val_array.push(value[measurement]);
                    time_array.push(Date.parse(value["time"]));
                }
                var std_val_array = standardize(val_array)
                // console.log(std_val_array);
                statistics[sensor["id"]][measurement] = {};
                statistics[sensor["id"]][measurement]["firstDerivs"] = firstDerivs(std_val_array, time_array);
                statistics[sensor["id"]][measurement]["maxVariation"] = maxVariation(std_val_array);
                statistics[sensor["id"]][measurement]["stdev"] = stdev(val_array);
                statistics[sensor["id"]][measurement]["stream"] = stream(val_array, time_array);
            }
        }
        return statistics;
    }

    function standardize(values) {
        const mean = math.mean(values);
        const std = math.std(values);
        let std_values = [];
        if (std) {
            for (const value of values) {
                std_values.push((value - mean) / std);
            }
            return std_values;
        }
        else {
            return values;
        }
        
    }

    function firstDerivs(values, timesteps) {
        // console.log(values);
        // console.log(timesteps);
        var val_diffs = values.slice(1).map((val,i) => val - values[i]);
        // console.log(val_diffs);
        var time_diffs = timesteps.slice(1).map((val,i) => (val - timesteps[i]) / 1000);
        // console.log(time_diffs);
        var first_derivs = math.dotDivide(val_diffs, time_diffs);
        // console.log(first_derivs);
        return first_derivs;
    }

    function maxVariation(values) {
        var max = values[0];
        var min = values[0];
        values.slice(1).forEach((value) => {
            if (value > max) {
                max = value;
            }
            if (value < min) {
                min = value;
            }
        });
        return (max - min) / max; 
    }

    function stdev(values) {
        return math.std(values);
    }

    function stream(values, timesteps) {
        return [values, timesteps];
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