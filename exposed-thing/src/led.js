"use strict";
exports.__esModule = true;
var request = require('request');
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
            led.read().then(function (state) {
                state = state ^ 1;
                led.write(state);
                console.log("Led toggled to: " + state);
            });
            resolve("Led toggled");
        });
    };
    WotDevice.prototype.add_properties = function () {
        this.thing.writeProperty("state", 0); // initialize led to 0
        this.thing.readProperty("state").then(function (res) { return console.log("Initial led state: " + res); })["catch"](function () { return console.log("Error"); });
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler);
    };
    WotDevice.prototype.add_actions = function () {
        this.thing.setActionHandler("toggle", this.toggleActionHandler);
    };
    return WotDevice;
}());
exports.WotDevice = WotDevice;
