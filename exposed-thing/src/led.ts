import * as WoT from "wot-typescript-definitions"

var request = require('request');

const Gpio = require('onoff').Gpio;
const led = new Gpio(17, 'out');

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
                title : "led",
                description : "A led connected to the rpi",
                securityDefinitions: { 
                    "": { 
                        "scheme": "" 
                    }
                },
                security: "",
                properties:{
                    state:{
                            description: "Current led state",
                            type: "number"
                    }
                },
                actions:{
                    toggle:{
                        description: "Toggle the state of the led",	
                        output:{
							type: "string"
						}
                    },
                }
            }
        ).then((exposedThing)=>{
            this.thing = exposedThing;
            this.td = exposedThing.getThingDescription();
            this.add_properties();
            this.add_actions();
            this.thing.expose();
            if (tdDirectory) { this.register(tdDirectory); }
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
        return new Promise((resolve, reject) => {
            led.read().then(state => {
                console.log("Current state of the led: " + state)
                resolve(state)
            })
        });
    }

    private toggleActionHandler(){
        return new Promise((resolve, reject) => {
            led.read().then(state => {
                state = state ^ 1
                led.write(state)
                console.log("Led toggled to: " + state)
            })
            resolve("Led toggled")
        });	
    }

    private add_properties() {
        this.thing.writeProperty("state", 0);   // initialize led to 0
        this.thing.readProperty("state").then(res => console.log("Initial led state: " + res)).catch(() => console.log("Error"))
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler)
        
    }

    private add_actions() {
        this.thing.setActionHandler("toggle", this.toggleActionHandler);
    }
}
