"use strict";
exports.__esModule = true;
var request = require('request');
var Ajv = require('ajv');
var ajv = new Ajv();
var Gpio = require('onoff').Gpio;
var led = new Gpio(17, 'out');
var WotDevice = /** @class */ (function () {
    function WotDevice(WoT, tdDirectory) {
        var _this = this;
        //create WotDevice as a server
        this.WoT = WoT;
        this.WoT.produce(
        //fill in the empty quotation marks
        {
            "@context": [
                "https://www.w3.org/2019/wot/td/v1",
                { "@language": "en" }
            ],
            "@type": "",
            id: "new:thing",
            title: "led",
            description: "A led connected to the rpi",
            securityDefinitions: {
                "": {
                    "scheme": ""
                }
            },
            security: "",
            properties: {
                state: {
                    description: "Current led state",
                    type: "number"
                }
            },
            actions: {
                toggle: {
                    description: "Toggle the state of the led",
                    output: {
                        type: "string"
                    }
                },
                "switch": {
                    description: "Switch the state of the led depending on the input",
                    input: {
                        type: 'object',
                        properties: {
                            newState: {
                                type: 'integer',
                                description: "Determines the value of the new state",
                                minimum: 0,
                                maximum: 1
                            }
                        },
                        required: ['newState']
                    },
                    output: {
                        type: "string"
                    }
                }
            }
        }).then(function (exposedThing) {
            _this.thing = exposedThing;
            _this.td = exposedThing.getThingDescription();
            _this.add_properties();
            _this.add_actions();
            _this.thing.expose();
            if (tdDirectory) {
                _this.register(tdDirectory);
            }
            // this.listen_to_myEvent(); //used to listen to specific events provided by a library. If you don't have events, simply remove it
        });
    }
    WotDevice.prototype.register = function (directory) {
        var _this = this;
        console.log("Registering TD in directory: " + directory);
        request.post(directory, { json: this.thing.getThingDescription() }, function (error, response, body) {
            if (!error && response.statusCode < 300) {
                console.log("TD registered!");
            }
            else {
                console.debug(error);
                console.debug(response);
                console.warn("Failed to register TD. Will try again in 10 Seconds...");
                setTimeout(function () { _this.register(directory); }, 10000);
                return;
            }
        });
    };
    WotDevice.prototype.statePropertyHandler = function () {
        return new Promise(function (resolve, reject) {
            led.read().then(function (state) {
                console.log("Current state of the led: " + state);
                resolve(state);
            });
        });
    };
    WotDevice.prototype.toggleActionHandler = function () {
        return new Promise(function (resolve, reject) {
            led.read().then(function (state) {
                state = state ^ 1;
                led.write(state);
                console.log("Led toggled to: " + state);
            });
            resolve("Led toggled");
        });
    };
    WotDevice.prototype.switchActionHandler = function (newState) {
        return new Promise(function (resolve, reject) {
            led.write(newState);
            resolve("New led state: " + newState);
        });
    };
    // private listen_to_myEvent() {
    //     /*
    //     specialLibrary.getMyEvent()//change specialLibrary to your library
    //     .then((thisEvent) => {
    //         this.thing.emitEvent("myEvent",""); //change quotes to your own event data
    //     });
    //     */
    // }
    WotDevice.prototype.add_properties = function () {
        this.thing.writeProperty("state", 0); // initialize led to 0
        this.thing.readProperty("state").then(function (res) { return console.log("Initial led state: " + res); })["catch"](function () { return console.log("Error"); });
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler);
    };
    WotDevice.prototype.add_actions = function () {
        var _this = this;
        this.thing.setActionHandler("toggle", this.toggleActionHandler);
        /*  FORMAT OF THE 'SWITCH' ACTION:
            url: {}/led/actions/switch
            body: {
                "newState": 0 (or 1)
            }
            format: application/json
        */
        this.thing.setActionHandler("switch", function (inputData) {
            return new Promise(function (resolve, reject) {
                if (!ajv.validate(_this.td.actions["switch"].input, inputData)) {
                    reject(new Error("Invalid input"));
                }
                else {
                    resolve(_this.switchActionHandler(inputData["newState"]));
                }
            });
        });
    };
    return WotDevice;
}());
exports.WotDevice = WotDevice;
