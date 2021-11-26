const noble = require("@abandonware/noble");
const math = require("mathjs");



exports.scan = function(updateVPhistory, setPossibleCandidate, setNoVPnearBy, resetNoVPnearBy) {
    var VPsnapshotsUpdate = {};  // json storing the values sensed from the near by Thunderboards
    var advertisements = {};    // json momentarily storing the duplicate advertisements until the first one is processed
    var countVPsnapshot = 0;
    var lastThreeSnapshots = [{}, {}, {}];

    const advSignalThreshold = -40;   // threshold to determine local VPs
    const servicesUUID = [];  // looking for all services
    const manufacturerId = "4700";  // scan for devices with this manufacturer ID
    const checkVPnearByInterval = 20000;  // interval for periodic check of VP near by

    
    noble.startScanning(servicesUUID, true);    // allow multiple advertisements from the same device

    var noPresenceTimeout = setNoPresenceTimeout();


    noble.on('discover', async (peripheral) => {
        
        var advData = peripheral.advertisement.manufacturerData;
        var advAddress = peripheral.address;
        var advTimestamp = Date.now();

        if (isVP(advData)) {
            if (! advertisements.hasOwnProperty(advAddress)) {
                advertisements[advAddress] = [];
            }
            advertisements[advAddress].push([advData, advAddress, advTimestamp]);
            // wait "a bit" to receive all the duplicates and then consider only the first advertisement
            setTimeout(() => {
                if (advertisements[advAddress].length != 0) {
                    if (isNearBy(peripheral.rssi)) {
                        clearTimeout(noPresenceTimeout);
                        resetNoVPnearBy();
                        console.log("[" + advAddress + "]" + " in the room with RSSI: ", peripheral.rssi);
                        var firstAdvertisement = advertisements[advAddress][0];     // first advertisement = [data buffer, VP address, timestamp]
                        updateLocalVPsnapshots(firstAdvertisement[0], firstAdvertisement[1], firstAdvertisement[2]);
                        noPresenceTimeout = setNoPresenceTimeout();
                    }
                    else {
                        vpIsAway(advAddress);
                    }
                    advertisements[advAddress] = [];
                }
            }, 100);    // thunderboards broadcast three replicas 20 ms apart  
        }
    });

    function vpIsAway(advAddress) {
        console.log("\n[" + advAddress + "]: VP not in this room.")
    }

    // periodically check whether there are VPs in the room (if this timeout expires it means that no VP near by was detected)
    function setNoPresenceTimeout() {
        return setTimeout(() => {
            console.log("\nNo VP near by")
            setNoVPnearBy();
        }
        , checkVPnearByInterval);
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