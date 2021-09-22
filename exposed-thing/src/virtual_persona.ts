import * as WoT from "wot-typescript-definitions"

var request = require('request');
const jsonfile = require('jsonfile');
const snapshotsFile = 'snapshots.json'

export class WotDevice {
    public thing: WoT.ExposedThing;
    public WoT: WoT.WoT;
    public td: any;
    public snapshots: object;
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
                title : "virtual_persona",
                description : "The virtual persona of Massimo Albarello",
                securityDefinitions: { 
                    "": { 
                        "scheme": "" 
                    }
                },
                security: "",
                properties:{
                    snapshots:{
                            description: "Snapshots of the interactions between user and WoT devices",
                            type: "object"
                    }
                }
            }
        ).then(async (exposedThing)=>{
            this.thing = exposedThing;
            this.td = exposedThing.getThingDescription();
            await this.getVirtualPersona();
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

    private async getVirtualPersona() {
        this.snapshots = await jsonfile.readFile(snapshotsFile)
        console.log("Snapshots of interactions loaded from file: ")
        console.log(this.snapshots);
    }

    private snapshotsWriteHandler(res) {
        return new Promise((resolve, reject) => {
            console.log(res)
            jsonfile.writeFile(snapshotsFile, res, (err) => console.log(err));
            resolve(res)
        })
    }

    private add_properties() {
        this.thing.writeProperty("snapshots", this.snapshots);
        this.thing.setPropertyWriteHandler("snapshots", this.snapshotsWriteHandler)
    }
}
