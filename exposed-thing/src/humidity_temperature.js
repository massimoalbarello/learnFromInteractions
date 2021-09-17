"use strict";
exports.__esModule = true;
var request = require('request');
var sensor = require("node-dht-sensor");
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
            title: "humidity_temperature",
            description: "A humidity and temperature sensor connected to the rpi",
            securityDefinitions: {
                "": {
                    "scheme": ""
                }
            },
            security: "",
            properties: {
                state: {
                    description: "Current humidity and temperature values",
                    type: "object"
                }
            }
        }).then(function (exposedThing) {
            _this.thing = exposedThing;
            _this.td = exposedThing.getThingDescription();
            _this.add_properties();
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
            sensor.read(11, 27, function (err, temperature, humidity) {
                if (!err) {
                    console.log("Temperature: " + temperature);
                    console.log("Humidity: " + humidity);
                    resolve({
                        "temperature": temperature,
                        "humidity": humidity
                    });
                }
            });
        });
    };
    WotDevice.prototype.add_properties = function () {
        this.thing.writeProperty("state", {
            "temperature": 0,
            "humidity": 0
        });
        this.thing.setPropertyReadHandler("state", this.statePropertyHandler);
    };
    return WotDevice;
}());
exports.WotDevice = WotDevice;
