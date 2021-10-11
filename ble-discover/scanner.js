const noble = require('@abandonware/noble');
const fs = require('fs');
        


var localVPs = {};  // json storing the values sensed from the near by Thunderboards

const thresh = -10000   // threshold to determine local VPs
const servicesUUID = [];  // looking for all services
const manufacturerId = "4700";  // scan for devices with this manufacturer ID



noble.startScanning(servicesUUID, true);    // allow multiple broadcasts from the same device



noble.on('discover', async (peripheral) => {
    
    var data = peripheral.advertisement.manufacturerData;
    var address = peripheral.address;
    var timestamp = Date.now()

    if (isVP(data)) {
        console.log("\nPower level:", peripheral.rssi)
        if (isNearBy(peripheral.rssi)) {
            updateVP(data, address, timestamp);
        }
        else {
            localVPs[address]["belowThresh"] = localVPs[address]["belowThresh"] + 1;
            if (localVPs[address]["belowThresh"] < 3) {
                updateVP(data, address, timestamp);
            }
            else {
                vpIsAway(address)
            }
        }
    }
});



function vpIsAway(address) {
    console.log("\n[" + address + "]: VP not in this room.")
    localVPs[address]["nearBy"] = false;
}



function updateVP() {
    if (isRegistered(address)) {
        addSnapshot(data, address, timestamp);
    }
    else {
        localVPs[address] = {};
        addSnapshot(data, address, timestamp);
    }
}

function addSnapshot(data, address, timestamp) {
    localVPs[address][timestamp] = vpSnapshot(data, address);
    localVPs[address]["belowThresh"] = 0;
    localVPs[address]["nearBy"] = true;
}

function vpSnapshot(data, address) {
    console.log("\n[" + address + "]: received new data.");

    if (data.readUInt16LE(10) === 1) {
        listenForAction(address);
    }

    const snapshot = {
        "temperature": data.readInt16LE(2),
        "humidity": data.readUInt16LE(4),
        "lux": data.readUInt16LE(6),
        "uvi": data.readUInt16LE(8),
        "hall": data.readUInt16LE(10),
        "sound": data.readUInt16LE(12),
        "pressure": data.readUInt16LE(14),
        "co2": data.readUInt16LE(16),
        "tvoc": data.readUInt16LE(18),
        "battery": data.readUInt8(20),
        "id": data.readUInt8(21),
    };
    console.log(snapshot);

    return snapshot;
}

function listenForAction(address) {
    console.log("\n[" + address + "]: about to do an action!");
    // start recording data from sensors and check which device the user will interact with
}



function isVP(data) {
    return data && data.slice(0, 2).toString("hex") == manufacturerId
}

function isNearBy(rssi) {
    return rssi > thresh
}

function isRegistered(address) {
    return localVPs.hasOwnProperty(address)
}
