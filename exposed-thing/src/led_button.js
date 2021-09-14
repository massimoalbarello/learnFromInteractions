"use strict";
exports.__esModule = true;
var request = require('request');
var Ajv = require('ajv');
var ajv = new Ajv();
var Gpio = require('onoff').Gpio;
var led = new Gpio(17, 'out');
var button = new Gpio(4, 'in', 'falling');
function toggleLed() {
    led.read().then(function (state) {
        state = state ^ 1;
        led.write(state);
        console.log("Led toggled to: " + state);
    });
}
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
            title: "led_button",
            description: "A led and a button connected to the rpi",
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
            },
            events: {
                buttonPressed: {
                    description: "Detects the press of the button",
                    data: {
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
            _this.listen_to_myEvent();
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
                resolve({ "state": state });
            });
        });
    };
    WotDevice.prototype.toggleActionHandler = function () {
        return new Promise(function (resolve, reject) {
            toggleLed();
            resolve("Led toggled");
        });
    };
    WotDevice.prototype.switchActionHandler = function (newState) {
        return new Promise(function (resolve, reject) {
            led.write(newState);
            resolve("New led state: " + newState);
        });
    };
    WotDevice.prototype.listen_to_myEvent = function () {
        var _this = this;
        /*
            SUBSCRIBE TO 'BUTTONPRESSED' EVENT:
            verb: get
            url: {}/led_button/events/buttonPressed
        */
        button.watch(function () {
            console.log("Button pressed");
            _this.thing.emitEvent("buttonPressed", "Button pressed");
            toggleLed();
        });
    };
    WotDevice.prototype.add_properties = function () {
        this.thing.writeProperty("state", 0); // initialize led to 0
        this.thing.readProperty("state").then(function (state) { return console.log("Initial led state: " + state); })["catch"](function () { return console.log("Error reading 'state' property"); });
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler);
    };
    WotDevice.prototype.add_actions = function () {
        var _this = this;
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
