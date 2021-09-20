"use strict";
exports.__esModule = true;
var request = require('request');
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
            title: "virtual_persona",
            description: "The virtual persona of Massimo Albarello",
            securityDefinitions: {
                "": {
                    "scheme": ""
                }
            },
            security: "",
            properties: {
                knowledgeGraph: {
                    description: "Knowledge graph constructed as the user interacts with WoT devices",
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
    WotDevice.prototype.knowledgeGraphWriteHandler = function (res) {
        return new Promise(function (resolve, reject) {
            console.log(res);
            resolve(res);
        });
    };
    WotDevice.prototype.add_properties = function () {
        this.kg = {};
        this.thing.writeProperty("knowledgeGraph", this.kg);
        this.thing.setPropertyWriteHandler("knowledgeGraph", this.knowledgeGraphWriteHandler);
    };
    return WotDevice;
}());
exports.WotDevice = WotDevice;
