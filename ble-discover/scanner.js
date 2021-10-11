const noble = require('@abandonware/noble');
const fs = require('fs');
        


var localVPs = {};  // json storing the values sensed from the near by Thunderboards

const servicesUUID = [];  // looking for all services
const manufacturerId = "4700";  // scan for devices with this manufacturer ID



noble.startScanning(servicesUUID, true);    // allow multiple broadcasts from the same device



noble.on('discover', async (peripheral) => {
    
    var data = peripheral.advertisement.manufacturerData;

    if (isVP(data)) {
        console.log("\nPower level:", peripheral.rssi)

        var timestamp = Date.now()
        var snapshot = vpSnapshot(data, peripheral.address);
        if (localVPs.hasOwnProperty(peripheral.address)) {
            localVPs[peripheral.address][timestamp] = snapshot;
        }
        else {
            localVPs[peripheral.address] = {};
            localVPs[peripheral.address][timestamp] = snapshot;
        }
    }
});



function isVP(data) {
    return data && data.slice(0, 2).toString("hex") == manufacturerId
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
