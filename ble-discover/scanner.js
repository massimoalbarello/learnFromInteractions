const noble = require("@abandonware/noble");



exports.scan = function(updateVPhistory, setPossibleCandidate) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var advertisements = {};    // json momentarily storing the duplicate advertisements until the first one is processed
    var countVPsnapshot = 0;

    const advSignalThreshold = -100;   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID
    

    
    noble.startScanning(servicesUUID, true);    // allow multiple advertisements from the same device


    noble.on('discover', async (peripheral) => {
        
        var advData = peripheral.advertisement.manufacturerData;
        var advAddress = peripheral.address;
        var advTimestamp = Date.now();

        if (isVP(advData)) {
            if (isNearBy(peripheral.rssi)) {
                if (! advertisements.hasOwnProperty(advAddress)) {
                    advertisements[advAddress] = [];
                }
                advertisements[advAddress].push([advData, advAddress, advTimestamp]);
                // wait "a bit" to receiv all the duplicates and then consider only the first advertisement
                setTimeout(() => {
                    if (advertisements[advAddress].length != 0) {
                        var firstAdvertisement = advertisements[advAddress][0];    
                        updateLocalVPsnapshots(firstAdvertisement[0], firstAdvertisement[1], firstAdvertisement[2]);
                        countVPsnapshot = countVPsnapshot + 1;
                        if (countVPsnapshot === 1){
                            countVPsnapshot = 0;
                            // console.log("\nUpdating history...")
                            updateVPhistory({...VPsnapshotsUpdate});
                            VPsnapshotsUpdate = {};
                        }
                        advertisements[advAddress] = [];
                    }
                }, 500);
            }
            else {
                vpIsAway(advAddress)
            }
        }
    });

    function vpIsAway(advAddress) {
        // console.log("\n[" + advAddress + "]: VP not in this room.")
    }



    function updateLocalVPsnapshots(firstAdvData, advAddress, firstAdvTimestamp) {
        if (isRegistered(advAddress)) {
            addSnapshot(firstAdvData, advAddress, firstAdvTimestamp);
        }
        else {
            VPsnapshotsUpdate[advAddress] = {};
            addSnapshot(firstAdvData, advAddress, firstAdvTimestamp);
        }
    }

    function addSnapshot(firstAdvData, advAddress, firstAdvTimestamp) {
        VPsnapshotsUpdate[advAddress][firstAdvTimestamp] = vpSnapshot(firstAdvData, advAddress, firstAdvTimestamp);
    }

    async function vpSnapshot(firstAdvData, advAddress, firstAdvTimestamp) {
        // console.log("\n[" + advAddress + "]: received new data.");
        const snapshot = {
            "temperature": firstAdvData.readInt16LE(2),
            "humidity": firstAdvData.readUInt16LE(4),
            "lux": firstAdvData.readUInt16LE(6),
            // "uvi": firstAdvData.readUInt16LE(8),
            "hall": firstAdvData.readUInt16LE(10),
            // "sound": firstAdvData.readUInt16LE(12),
            // "pressure": firstAdvData.readUInt16LE(14),
            // "co2": firstAdvData.readUInt16LE(16),
            // "tvoc": firstAdvData.readUInt16LE(18),
            // "battery": firstAdvData.readUInt8(20),
            // "id": firstAdvData.readUInt8(21),
        };
        // console.log(snapshot);

        if (snapshot["hall"] === 1) {
            setPossibleCandidate(advAddress, snapshot, firstAdvTimestamp);
        }

        return snapshot;
    }



    function isVP(advData) {
        return advData && advData.slice(0, 2).toString("hex") == manufacturerId
    }

    function isNearBy(rssi) {
        return rssi > advSignalThreshold
    }

    function isRegistered(advAddress) {
        return VPsnapshotsUpdate.hasOwnProperty(advAddress)
    }

}