/********************************************************************************
 * Copyright (c) 2019 - 2021 Contributors to the Eclipse Foundation
 * 
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 * 
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 * 
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
import * as WoT from "wot-typescript-definitions"

var request = require('request');

const Ajv = require('ajv');
var ajv = new Ajv();

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
                }
            }
        ).then((exposedThing)=>{
            this.thing = exposedThing;
            this.td = exposedThing.getThingDescription();
            this.add_properties();
            this.add_actions();
            this.thing.expose();
            if (tdDirectory) { this.register(tdDirectory); }
            // this.listen_to_myEvent(); //used to listen to specific events provided by a library. If you don't have events, simply remove it
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
                resolve({"state": state})
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

    private switchActionHandler(newState){
        return new Promise((resolve, reject) => {
            led.write(newState)
            resolve("New led state: " + newState);
        });	
    }

    // private listen_to_myEvent() {
    //     /*
    //     specialLibrary.getMyEvent()//change specialLibrary to your library
    //     .then((thisEvent) => {
    //         this.thing.emitEvent("myEvent",""); //change quotes to your own event data
    //     });
    //     */
    // }

    private add_properties() {
        this.thing.writeProperty("state", 0);   // initialize led to 0
        this.thing.readProperty("state").then(res => console.log("Initial led state: " + res)).catch(() => console.log("Error"))
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler)
        
    }

    private add_actions() {
        this.thing.setActionHandler("toggle", this.toggleActionHandler);
        /*  FORMAT OF THE 'SWITCH' ACTION:
            url: {}/led/actions/switch
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
