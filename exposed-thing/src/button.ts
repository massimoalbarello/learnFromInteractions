import * as WoT from "wot-typescript-definitions"

var request = require('request');

const Gpio = require('onoff').Gpio;
const button = new Gpio(4, 'in', 'falling');

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
                title : "button",
                description : "A button connected to the rpi",
                securityDefinitions: { 
                    "": { 
                        "scheme": "" 
                    }
                },
                security: "",
                events:{
                	press:{
                        description: "Detects the press of the button",
                        data:{
                            type: "string"
                        }
                    },                      
				},
            }
        ).then((exposedThing)=>{
            this.thing = exposedThing;
            this.td = exposedThing.getThingDescription();
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

    private listen_to_buttonPress() {
        /*
            SUBSCRIBE TO 'PRESS' EVENT:
            verb: get
            url: {}/button/events/press
        */
        button.watch(async () => {
            console.log("Button pressed");
            this.thing.emitEvent("press", "Button pressed");
        });
    }
}