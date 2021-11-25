const noble = require("@abandonware/noble");
const math = require("mathjs");



exports.scan = function(updateVPhistory, setPossibleCandidate, getSnapshotsLabelledOff, stopOffSnapshotTimeout) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var advertisements = {};    // json momentarily storing the duplicate advertisements until the first one is processed
    var countVPsnapshot = 0;
    var lastThreeSnapshots = [{}, {}, {}];

    const advSignalThreshold = -70;   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID
    

    
    noble.startScanning(servicesUUID, true);    // allow multiple advertisements from the same device

    var presenceTimeout = setPresenceTimeout();


    noble.on('discover', async (peripheral) => {
        
        var advData = peripheral.advertisement.manufacturerData;
        var advAddress = peripheral.address;
        var advTimestamp = Date.now();

        if (isVP(advData)) {
            if (! advertisements.hasOwnProperty(advAddress)) {
                advertisements[advAddress] = [];
            }
            advertisements[advAddress].push([advData, advAddress, advTimestamp]);
            // wait "a bit" to receiv all the duplicates and then consider only the first advertisement
            setTimeout(() => {
                if (advertisements[advAddress].length != 0) {
                    clearTimeout(presenceTimeout);
                    stopOffSnapshotTimeout();
                    if (isNearBy(peripheral.rssi)) {
                        console.log("[" + advAddress + "]" + " in the room with RSSI: ", peripheral.rssi);
                        var firstAdvertisement = advertisements[advAddress][0];     // first advertisement = [data buffer, VP address, timestamp]
                        updateLocalVPsnapshots(firstAdvertisement[0], firstAdvertisement[1], firstAdvertisement[2]);
                    }
                    else {
                        vpIsAway(advAddress);
                    }
                    advertisements[advAddress] = [];
                    presenceTimeout = setPresenceTimeout();
                }
            }, 500);
        }
    });

    function vpIsAway(advAddress) {
        console.log("\n[" + advAddress + "]: VP not in this room.")
    }

    // periodically check whether there are VPs in the room
    function setPresenceTimeout() {
        return setTimeout(() => {
            console.log("\nNo one in the room")
            getSnapshotsLabelledOff();
        }
        , 60000);
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
        countVPsnapshot = countVPsnapshot + 1;
        if (countVPsnapshot === 1){
            countVPsnapshot = 0;
            // console.log("\nUpdating history...")
            updateVPhistory({...VPsnapshotsUpdate});
            VPsnapshotsUpdate = {};
        }
    }

    function vpSnapshot(firstAdvData, advAddress, firstAdvTimestamp) {
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

        if (snapshot["hall"] !== 1) {
            lastThreeSnapshots[0] = lastThreeSnapshots[1];
            lastThreeSnapshots[1] = lastThreeSnapshots[2];
            lastThreeSnapshots[2] = snapshot;
        }
        else {
            var avgLastThreeSnaps = averageSnapshots();
            if (Object.keys(avgLastThreeSnaps).length !== 0) {
                // console.log("Using average of last three snapshots before btn0 was pressed")
                setPossibleCandidate(advAddress, avgLastThreeSnaps, firstAdvTimestamp);
            }
            else {
                console.log("Haven't received any previous snapshots")
            }
        }
        return snapshot;
    }

    function averageSnapshots() { 
        // calculate the average values from the up to three last snapshots received before the one with btn0 pressed    
        var lastKVpair = lastThreeSnapshots[0]
        var count = 1;
        var firstValidKVpairIdx = 0;
        for (var currentKVpair of lastThreeSnapshots.slice(1)) {
            if (Object.keys(lastKVpair).length !== 0) {
                lastKVpair = Object.values(lastKVpair).map((value,idx) => value + Object.values(currentKVpair)[idx]);
                count += 1;
            }
            else {
                lastKVpair = Object.values(currentKVpair);
                firstValidKVpairIdx += 1;
            }
        }
        avg = math.dotDivide(lastKVpair, count);

        avgObj = {}
        Object.keys(lastThreeSnapshots[firstValidKVpairIdx]).forEach((key, idx) => {
            avgObj[key] = avg[idx];
        })
        delete avgObj["hall"];
        return avgObj;
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