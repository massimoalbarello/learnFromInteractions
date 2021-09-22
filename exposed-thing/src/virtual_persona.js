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
var jsonfile = require('jsonfile');
var snapshotsFile = 'snapshots.json';
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
                snapshots: {
                    description: "Snapshots of the interactions between user and WoT devices",
                    type: "object"
                }
            }
        }).then(function (exposedThing) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.thing = exposedThing;
                        this.td = exposedThing.getThingDescription();
                        return [4 /*yield*/, this.getVirtualPersona()];
                    case 1:
                        _a.sent();
                        this.add_properties();
                        this.thing.expose();
                        if (tdDirectory) {
                            this.register(tdDirectory);
                        }
                        return [2 /*return*/];
                }
            });
        }); });
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
    WotDevice.prototype.getVirtualPersona = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, jsonfile.readFile(snapshotsFile)];
                    case 1:
                        _a.snapshots = _b.sent();
                        console.log("Snapshots of interactions loaded from file: ");
                        console.log(this.snapshots);
                        return [2 /*return*/];
                }
            });
        });
    };
    WotDevice.prototype.snapshotsWriteHandler = function (res) {
        return new Promise(function (resolve, reject) {
            console.log(res);
            jsonfile.writeFile(snapshotsFile, res, function (err) { return console.log(err); });
            resolve(res);
        });
    };
    WotDevice.prototype.add_properties = function () {
        this.thing.writeProperty("snapshots", this.snapshots);
        this.thing.setPropertyWriteHandler("snapshots", this.snapshotsWriteHandler);
    };
    return WotDevice;
}());
exports.WotDevice = WotDevice;
