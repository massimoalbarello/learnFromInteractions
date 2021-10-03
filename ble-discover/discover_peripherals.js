const noble = require('@abandonware/noble');

noble.startScanning();

noble.on('discover', async (peripheral) => {
  console.log("Peripheral discovered");
  console.log(peripheral.address);
  console.log(peripheral.advertisement.txPowerLevel);
  console.log()
});