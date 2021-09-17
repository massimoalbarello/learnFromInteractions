"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var request = require('request');
var Ajv = require('ajv');
var ajv = new Ajv();
var Gpio = require('onoff').Gpio;
var led = new Gpio(17, 'out');
var button = new Gpio(4, 'in', 'falling');
function toggleLed() {
    return __awaiter(this, void 0, void 0, function () {
        var state;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, led.read()];
                case 1:
                    state = _a.sent();
                    state = state ^ 1;
                    led.write(state);
                    return [2 /*return*/, state];
            }
        });
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
                    type: "object",
                    observable: true
                }
            },
            actions: {
                toggle: {
                    description: "Toggle the state of the led",
                    output: {
                        type: "object"
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
                        type: "object"
                    }
                }
            },
            events: {
                buttonPressed: {
                    description: "Detects the press of the button",
                    data: {
                        type: "string"
                    }
                },
                state: {
                    description: "Detects the change of the led state",
                    data: {
                        type: "object"
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
            _this.listen_to_buttonPress();
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
        return led.read().then(function (state) {
            console.log("Current state of the led: " + state);
            return {
                "state": state,
                "timestamp": 56
            };
        });
    };
    WotDevice.prototype.toggleActionHandler = function () {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, toggleLed()];
                    case 1:
                        state = _a.sent();
                        console.log("HTTP post, led toggled to: " + state);
                        // this.thing.writeProperty("state", state);
                        // return ("New led state: " + state);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                _this.thing.writeProperty("state", {
                                    "state": state,
                                    "timestamp": 56
                                });
                                resolve("New led state: " + state);
                            })];
                }
            });
        });
    };
    WotDevice.prototype.switchActionHandler = function (newState) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            led.write(newState);
            _this.thing.writeProperty("state", {
                "state": newState,
                "timestamp": 56
            });
            resolve("New led state: " + newState);
        });
    };
    WotDevice.prototype.listen_to_buttonPress = function () {
        var _this = this;
        /*
            SUBSCRIBE TO 'BUTTONPRESSED' EVENT:
            verb: get
            url: {}/led_button/events/buttonPressed
        */
        button.watch(function () { return __awaiter(_this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, toggleLed()];
                    case 1:
                        state = _a.sent();
                        console.log("Button pressed, led toggled to: " + state);
                        this.thing.emitEvent("buttonPressed", "Button pressed, led toggled to: " + state);
                        this.thing.writeProperty("state", {
                            "state": state,
                            "timestamp": 56
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    };
    WotDevice.prototype.add_properties = function () {
        var _this = this;
        this.thing.writeProperty("state", {
            "state": 0,
            "timestamp": 56
        }); // initialize led to 0
        this.thing.readProperty("state").then(function (state) { return console.log("Initial led state: " + {
            "state": state,
            "timestamp": 56
        }); })["catch"](function () { return console.log("Error reading 'state' property"); });
        this.thing.observeProperty('state', function (state) {
            console.log(state);
            _this.thing.emitEvent("state", state);
        });
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
