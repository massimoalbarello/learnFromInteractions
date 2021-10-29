const noble = require('@abandonware/noble');
const gpio = require("gpio");


exports.scan = function(updateVPhistory, setPossibleCandidate) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var countVPsnapshot = 0;

    const thresh = -100;   // threshold to determine local VPs
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
                countVPsnapshot = countVPsnapshot + 1;
                if (countVPsnapshot === 1){
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

        if (snapshot["hall"] === 1) {
            gpio4.set();
            setTimeout(() => gpio4.reset(), 1000);
            setPossibleCandidate(snapshot, address, timestamp);
        }

        return snapshot;
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