//Where your concrete implementation is included
WotButton = require("./src/button.js").WotDevice
WotLed = require("./src/led.js").WotDevice
WotHumTemp = require("./src/humidity_temperature.js").WotDevice
WotViPer = require("./src/virtual_persona.js").WotDevice


/*
This project supports the registration of the generated TD to a TD directory
Fill in the directory URI where the HTTP POST request to send the TD will be made
If you leave it empty, registration thread will never execute, otherwise it will try to register every 10 seconds 
*/
const TD_DIRECTORY = ""


Servient = require("@node-wot/core").Servient
//Importing the required bindings
HttpServer = require("@node-wot/binding-http").HttpServer
//CoapServer = require("@node-wot/binding-coap").CoapServer
//MqttBrokerServer = require("@node-wot/binding-mqtt").MqttBrokerServer

//Creating the instances of the binding servers
var httpServerButton = new HttpServer({port: 8080});
var httpServerLed = new HttpServer({port: 8081});
var httpServerHumTemp = new HttpServer({port: 8082});
var httpServerViPer = new HttpServer({port: 8083});
//var coapServer = new CoapServer({port: 5683});
//var mqttServer = new MqttBrokerServer("test.mosquitto.org"); //change it according to the broker address


//Building the servient object
let servientButton = new Servient();
let servientLed = new Servient();
let servientHumTemp = new Servient();
let servientViPer = new Servient();
//Adding different bindings to the server
servientButton.addServer(httpServerButton);
servientLed.addServer(httpServerLed);
servientHumTemp.addServer(httpServerHumTemp);
servientViPer.addServer(httpServerViPer);
//servient.addServer(coapServer);
//servient.addServer(mqttServer);

servientButton.start().then((WoT) => {
    wotButton = new WotButton(WoT, TD_DIRECTORY);
});

servientLed.start().then((WoT) => {
    wotLed = new WotLed(WoT, TD_DIRECTORY);
});

servientHumTemp.start().then((WoT) => {
    wotHumTemp = new WotHumTemp(WoT, TD_DIRECTORY);
});

servientViPer.start().then((WoT) => {
    wotViPer = new WotViPer(WoT, TD_DIRECTORY);
});
