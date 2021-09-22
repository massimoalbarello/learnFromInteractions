const {Servient, Helpers} = require("@node-wot/core")
const {HttpClientFactory} = require("@node-wot/binding-http");

let servientButton = new Servient();
let servientLed = new Servient();
let servientHumTemp = new Servient();
let servientViPer = new Servient();

servientButton.addClientFactory(new HttpClientFactory(null));
servientLed.addClientFactory(new HttpClientFactory(null));
servientHumTemp.addClientFactory(new HttpClientFactory(null));
servientViPer.addClientFactory(new HttpClientFactory(null));

let buttonHelper = new Helpers(servientButton);
let ledHelper = new Helpers(servientLed);
let humTempHelper = new Helpers(servientHumTemp);
let viPerHelper = new Helpers(servientViPer);

// here is where the discovery of devices nearby happens
const buttonThingAddress = "http://localhost:8080/button"
const ledThingAddress = "http://localhost:8081/led"
const humTempThingAddress = "http://localhost:8082/humidity_temperature"
const viPerAddress = "http://localhost:8083/virtual_persona"    // the virtual persona is treated as a WoT device

const main = async () => {
    const buttonWot = await servientButton.start();
    const ledWot = await servientLed.start();
    const humTempWot = await servientHumTemp.start();
    const viPerWot = await servientViPer.start();

    const buttonTd = await buttonHelper.fetch(buttonThingAddress);
    const ledTd = await ledHelper.fetch(ledThingAddress);
    const humTempTd = await humTempHelper.fetch(humTempThingAddress);
    const viPerTd = await viPerHelper.fetch(viPerAddress);

    const button = await buttonWot.consume(buttonTd);
    const led = await ledWot.consume(ledTd);
    const humTemp = await humTempWot.consume(humTempTd);
    const viPer = await viPerWot.consume(viPerTd);

    // a particular application that uses data from different devices
    // every time the user turns on/off the led, the manager takes a snapshot of the values measured by all the sensors so that
    // with as the number of snapshots increases it can learn which data can be used to predict the willingness of the user to switch the led on/off
    omniaApp(button, led, humTemp, viPer);
}

function omniaApp(button, led, humTemp, viPer) {
    button.subscribeEvent('press', async (response) => {
        log(response, "#")
        let toggle = await led.invokeAction('toggle');
        log(toggle, "*")
        off2on = await led.readProperty('state')
        
        snapshot(off2on, humTemp, viPer);
        });
}

async function snapshot(off2on, humTemp, viPer) {
    // take a snapshot of the current values of all the sensors
    let state = await humTemp.readProperty('state');
    log("Snapshot taken", "\"")
    log("Humidity: " + state["humidity"], "^")
    log("Temperature: " + state["temperature"], "^")
    snapshots = await viPer.readProperty('snapshots');
    if (off2on === 0) {
        // led was ON and was turned OFF
        if (! snapshots.hasOwnProperty("ledTurnedOff")) {
            snapshots["ledTurnedOff"] = {
                "humidity": [],
                "temperature": []
            };
        }
        snapshots["ledTurnedOff"]["humidity"].push(state["humidity"])
        snapshots["ledTurnedOff"]["temperature"].push(state["temperature"])
    }
    else {
        // led was OFF and was turned ON
        if (! snapshots.hasOwnProperty("ledTurnedOn")) {
            snapshots["ledTurnedOn"] = {
                "humidity": [],
                "temperature": []
            };
        }
        snapshots["ledTurnedOn"]["humidity"].push(state["humidity"])
        snapshots["ledTurnedOn"]["temperature"].push(state["temperature"])
    }
    log(snapshots, "@")
    viPer.writeProperty('snapshots', snapshots);
}

function log(value, separator) {
    console.log(separator.repeat(20))
    console.log(value)
    console.log(separator.repeat(20))
}

main()