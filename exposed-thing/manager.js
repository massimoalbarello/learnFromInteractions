const {Servient, Helpers} = require("@node-wot/core")
const {HttpClientFactory} = require("@node-wot/binding-http")

let servientButton = new Servient();
let servientLed = new Servient();

servientButton.addClientFactory(new HttpClientFactory(null));
servientLed.addClientFactory(new HttpClientFactory(null));


let buttonHelper = new Helpers(servientButton);
let ledHelper = new Helpers(servientLed);

// here is where the discovery of devices nearby happens
const buttonThingAddress = "http://localhost:8080/button"
const ledThingAddress = "http://localhost:8081/led"


const main = async () => {
    const buttonWot = await servientButton.start();
    const ledWot = await servientLed.start();

    const buttonTd = await buttonHelper.fetch(buttonThingAddress);
    const ledTd = await ledHelper.fetch(ledThingAddress);

    const button = await buttonWot.consume(buttonTd);
    const led = await ledWot.consume(ledTd);

    button.subscribeEvent('press', async (response) => {
        console.log("Button pressed")
        let toggle = await led.invokeAction('toggle');
        console.log(toggle)
        });
}

main()