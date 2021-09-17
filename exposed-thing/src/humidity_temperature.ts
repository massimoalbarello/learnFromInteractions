import * as WoT from "wot-typescript-definitions"

var request = require('request');

var sensor = require("node-dht-sensor");

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
                title : "humidity_temperature",
                description : "A humidity and temperature sensor connected to the rpi",
                securityDefinitions: { 
                    "": { 
                        "scheme": "" 
                    }
                },
                security: "",
                properties:{
                    state:{
                            description: "Current humidity and temperature values",
                            type: "object"
                    }
                }
            }
        ).then((exposedThing)=>{
            this.thing = exposedThing;
            this.td = exposedThing.getThingDescription();
            this.add_properties();
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
            sensor.read(11, 27, function(err, temperature, humidity) {
                if (!err) {
                    console.log("Temperature: " + temperature)
                    console.log("Humidity: " + humidity)
                    resolve({
                        "temperature": temperature,
                        "humidity": humidity
                    })
                }
            })
        });
    }

    private add_properties() {
        this.thing.writeProperty("state", {
            "temperature": 0,
            "humidity": 0
        });
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler)
    }
}
