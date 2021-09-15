import * as WoT from "wot-typescript-definitions"

var request = require('request');

const Ajv = require('ajv');
var ajv = new Ajv();

const Gpio = require('onoff').Gpio;
const led = new Gpio(17, 'out');
const button = new Gpio(4, 'in', 'falling');

async function toggleLed() {
    let state = await led.read();
    state = state ^ 1;
    led.write(state);
    console.log("Led toggled to: " + state);
    return state;
}

export class WotDevice {
    public thing: WoT.ExposedThing;
    public WoT: WoT.WoT;
    public td: any;
    constructor(WoT: WoT.WoT, tdDirectory?: string) {
        //create WotDevice as a server
        this.WoT = WoT;
        this.WoT.produce(
            //fill in the empty quotation marks
            {
                "@context": [
                    "https://www.w3.org/2019/wot/td/v1",
                    { "@language" : "en" }],
                "@type": "",
                id : "new:thing",
                title : "led_button",
                description : "A led and a button connected to the rpi",
                securityDefinitions: { 
                    "": { 
                        "scheme": "" 
                    }
                },
                security: "",
                properties:{
                    state:{
                            description: "Current led state",
                            type: "number",
                            observable: true,
                    }
                },
                actions:{
                    toggle:{
                        description: "Toggle the state of the led",	
                        output:{
                            type: "string"
                        }
                    },
                    switch:{
                        description: "Switch the state of the led depending on the input",	
                        input: {
                            type: 'object',
                            properties: {
                                newState: {
                                    type: 'integer',
                                    description: `Determines the value of the new state`,
                                    minimum: 0,
                                    maximum: 1
                                }
                            },
                            required: ['newState'],
                        },
                        output:{
                            type: "string"
                        }
                    }
                },
                events:{
                	buttonPressed:{
							description: "Detects the press of the button",
							data:{
								type: "string"
							}
							
					}
				},
            }
        ).then((exposedThing)=>{
            this.thing = exposedThing;
            this.td = exposedThing.getThingDescription();
            this.add_properties();
            this.add_actions();
            this.thing.expose();
            if (tdDirectory) { this.register(tdDirectory); }
            this.listen_to_buttonPress();
        });
    }
    
    public register(directory: string) {
        console.log("Registering TD in directory: " + directory)
        request.post(directory, {json: this.thing.getThingDescription()}, (error, response, body) => {
            if (!error && response.statusCode < 300) {
                console.log("TD registered!");
            } else {
                console.debug(error);
                console.debug(response);
                console.warn("Failed to register TD. Will try again in 10 Seconds...");
                setTimeout(() => { this.register(directory) }, 10000);
                return;
            }
        });
    }

    private statePropertyHandler(){
        return led.read().then(state => {
                console.log("Current state of the led: " + state);
                // return {"state": state};
                return state;

        });
    }

    private async toggleActionHandler() {
        const state = await toggleLed()
        // this.thing.writeProperty("state", state);
        return ("New led state: " + state);
    }

    private switchActionHandler(newState){
        return new Promise((resolve, reject) => {
            led.write(newState);
            resolve("New led state: " + newState);
        });	
    }

    private listen_to_buttonPress() {
        /*
            SUBSCRIBE TO 'BUTTONPRESSED' EVENT:
            verb: get
            url: {}/led_button/events/buttonPressed
        */
        button.watch(async () => {
            const state = await toggleLed()
            console.log("Button pressed, led toggled to: " + state)
            this.thing.emitEvent("buttonPressed", "Button pressed, led toggled to: " + state);
            this.thing.writeProperty("state", state);

        });
    }

    private add_properties() {
        this.thing.writeProperty("state", 0);   // initialize led to 0
        this.thing.readProperty("state").then(state => console.log("Initial led state: " + state)).catch(() => console.log("Error reading 'state' property"));
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler);
        
    }

    private add_actions() {
        /*  FORMAT OF THE 'TOGGLE' ACTION:
            verb: post
            url: {}/led_button/actions/toggle
        */
        this.thing.setActionHandler("toggle", this.toggleActionHandler);
        /*  FORMAT OF THE 'SWITCH' ACTION:
            verb: post
            url: {}/led_button/actions/switch
            body: {
                "newState": 0 (or 1)
            }
            format: application/json
        */
        this.thing.setActionHandler("switch", (inputData) => { 
            return new Promise((resolve, reject) => {
                if (!ajv.validate(this.td.actions.switch.input, inputData)) {
                    reject(new Error ("Invalid input"));
                }
                else {
                    resolve(this.switchActionHandler(inputData["newState"]));
                }
            });
        });
    }
}
