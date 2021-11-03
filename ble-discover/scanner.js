const noble = require("@abandonware/noble");
const buzzer = require("../feedback/buzzer").Buzzer;



exports.scan = function(updateVPhistory, setPossibleCandidate) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var countVPsnapshot = 0;
    var advertisements = {};    // json momentarily storing the duplicate advertisements until the first one is processed

    const thresh = -100;   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID
    const feedbackBuzzer = new buzzer(4);    // feedback buzzer on gpio 4
    

    
    noble.startScanning(servicesUUID, true);    // allow multiple broadcasts from the same device



    noble.on('discover', async (peripheral) => {
        
        var data = peripheral.advertisement.manufacturerData;
        var address = peripheral.address;
        var timestamp = Date.now()

        if (isVP(data, manufacturerId)) {
            if (isNearBy(peripheral.rssi, thresh)) {
                if (! advertisements.hasOwnProperty(address)) {
                    advertisements[address] = [];
                }
                advertisements[address].push([data, address, timestamp]);
                // wait "a bit" to receiv all the duplicates and then consider only the first advertisement
                setTimeout(() => {
                    if (advertisements[address].length != 0) {
                        var firstAdvertisement = advertisements[address][0];
                        updateLocalVPsnapshots(firstAdvertisement[0], firstAdvertisement[1], firstAdvertisement[2]);
                        countVPsnapshot = countVPsnapshot + 1;
                        if (countVPsnapshot === 1){
                            countVPsnapshot = 0;
                            // console.log("\nUpdating history...")
                            updateVPhistory({...VPsnapshotsUpdate});
                            VPsnapshotsUpdate = {};
                        }
                        advertisements[address] = [];
                    }
                }, 500);
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
            feedbackBuzzer.beep();
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