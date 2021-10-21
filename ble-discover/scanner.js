const noble = require('@abandonware/noble');
const influx = require('../influx-db/query_data');
const math = require('mathjs');
const normalize = require('array-normalize');

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
                if (count === 3){
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
            console.log(statistics);
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
                sensorsValues[sensor["id"]][measurement]  = await influx.db(measurement=measurement, sensor_id=sensor["id"], limit="LIMIT 10", timestamp=timestamp);
                // statistics.push([sensor["id"], measurement, maxVariation(sensorsValues[sensor["id"]], sensor["id"], measurement)])
                statistics[sensor["id"]][measurement] = {};
                statistics[sensor["id"]][measurement]["maxVariation"] = maxVariation(sensorsValues[sensor["id"]][measurement], sensor["id"], measurement);
                statistics[sensor["id"]][measurement]["stdev"] = stdev(sensorsValues[sensor["id"]][measurement], sensor["id"], measurement);
            }
        }
        return statistics;
    }

    function maxVariation(values, id, measurement) {
        // console.log("\n[" + id + "] : " + measurement + "\n", values);
        var max = values[0][measurement];
        var min = values[0][measurement];
        values.slice(1).forEach((value) => {
            if (value[measurement] > max) {
                max = value[measurement];
            }
            if (value[measurement] < min) {
                min = value[measurement];
            }
        });
        return (max - min) / max; 
    }

    function stdev(values, id, measurement) {
        // console.log("\n[" + id + "] : " + measurement + "\n", values);
        var val_array = [];
        for (const value of values) {
            val_array.push(value[measurement]);
        }
        return math.std(normalize(val_array));
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