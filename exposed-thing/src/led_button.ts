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
                            type: "object",
                            observable: true,
                    }
                },
                actions:{
                    toggle:{
                        description: "Toggle the state of the led",	
                        output:{
                            type: "object"
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
                            type: "object"
                        }
                    }
                },
                events:{
                	buttonPressed:{
                        description: "Detects the press of the button",
                        data:{
                            type: "string"
                        }
                    },
                    state:{
                        description: "Detects the change of the led state",
                        data:{
                            type: "object"
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
                return {
                    "state": state,
                    "timestamp": 56
                };

        });
    }

    private async toggleActionHandler() {
        const state = await toggleLed()
        console.log("HTTP post, led toggled to: " + state)
        // this.thing.writeProperty("state", state);    // give error 'cannot read property writeProperty of undefined'
        return ("New led state: " + state);
    }

    private switchActionHandler(newState){
        return new Promise((resolve, reject) => {
            led.write(newState);
            this.thing.writeProperty("state", {
                "state": newState,
                "timestamp": 56
            });
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
            this.thing.writeProperty("state", {
                "state": state,
                "timestamp": 56
            });

        });
    }    

    private add_properties() {
        this.thing.writeProperty("state", {
            "state": 0,
            "timestamp": 56
        });   // initialize led to 0
        this.thing.readProperty("state").then(state => console.log("Initial led state: " + {
            "state": state,
            "timestamp": 56
        })).catch(() => console.log("Error reading 'state' property"));
        this.thing.observeProperty('state', (state) => {
            console.log(state);
            this.thing.emitEvent("state", state);
        });
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
