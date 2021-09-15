Servient = require("@node-wot/core").Servient
HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory

Helpers = require("@node-wot/core").Helpers

let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

let wotHelper = new Helpers(servient);

const LedButtonThingAddress = "http://localhost:8080/led_button"

servient.start().then((WoT) => {
    wotHelper.fetch(LedButtonThingAddress).then(async (td) => {
        try {
            let thing = await WoT.consume(td);
            log("Thing Description:\n", td);

            // Read property 'state'
            let state = await thing.readProperty('state');
            log("Property 'state' value is: " +  state);

            // // Observe led state
            // thing.observeProperty('state', (state) => {
            //     log("Led state changed: " + state);
            // });

            // Toggle led state
            let toggle = await thing.invokeAction('toggle');
            log(toggle)

            // switch the led on
            let switchOn = await thing.invokeAction('switch', {'newState': 1});
            log(switchOn);
            
            // Handler for 'buttonPressed' event
            thing.subscribeEvent('buttonPressed', (response) => {
                log(response)
            });
        }
        catch (err) {
            console.error('Script error:', err);
        }
    });
    // Print data and an accompanying message in a distinguishable way
    function log(response) {
        console.log('======================');
        console.log(response);
        console.log('======================');
    }
});
