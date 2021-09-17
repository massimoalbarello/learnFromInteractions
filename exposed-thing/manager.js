const {Servient, Helpers} = require("@node-wot/core")
const {HttpClientFactory} = require("@node-wot/binding-http");
const { ScriptSnapshot } = require("typescript");

let servientButton = new Servient();
let servientLed = new Servient();
let servientHumTemp= new Servient();

servientButton.addClientFactory(new HttpClientFactory(null));
servientLed.addClientFactory(new HttpClientFactory(null));
servientHumTemp.addClientFactory(new HttpClientFactory(null));

let buttonHelper = new Helpers(servientButton);
let ledHelper = new Helpers(servientLed);
let humTempHelper = new Helpers(servientHumTemp);

// here is where the discovery of devices nearby happens
const buttonThingAddress = "http://localhost:8080/button"
const ledThingAddress = "http://localhost:8081/led"
const humTempThingAddress = "http://localhost:8082/humidity_temperature"

const main = async () => {
    const buttonWot = await servientButton.start();
    const ledWot = await servientLed.start();
    const humTempWot = await servientHumTemp.start();

    const buttonTd = await buttonHelper.fetch(buttonThingAddress);
    const ledTd = await ledHelper.fetch(ledThingAddress);
    const humTempTd = await humTempHelper.fetch(humTempThingAddress);

    const button = await buttonWot.consume(buttonTd);
    const led = await ledWot.consume(ledTd);
    const humTemp = await humTempWot.consume(humTempTd);


    button.subscribeEvent('press', async (response) => {
        log(response, "#")
        let toggle = await led.invokeAction('toggle');
        log(toggle, "*")
        
        // take snapshot of the current state of all sensors
        let state = await humTemp.readProperty('state');
        log("Snapshot taken", "@")
        log(state, "^")
        });
}

async function snapshot() {
    // take a snapshot of the current values of all the sensors
}

function log(value, separator) {
    console.log(separator.repeat(20))
    console.log(value)
    console.log(separator.repeat(20))
}

main()