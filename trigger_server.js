const http = require('http');

const settings = require('./settings');



exports.listen = function(determineWhoTriggered, getAutomaticNoActionSnapshot, stopAutomaticNoActionSnapshotTimeout) {

    const automaticNoActionSnapshotInterval = settings.automaticNoActionSnapshotInterval;
    const roomTrigger = settings.roomTrigger;
    var noActionTimeout = setNoActionTimeout();

    http.createServer(function (req, res) {
        req.on('data', (data) => {
            data = JSON.parse(data);
            if (data.hasOwnProperty("sentFrom") && data["sentFrom"] === "sensorPi") {
                if (data["room"] === roomTrigger) {
                    clearTimeout(noActionTimeout);
                    stopAutomaticNoActionSnapshotTimeout();
                    determineWhoTriggered(data);
                    noActionTimeout = setNoActionTimeout();
                    res.write('Thank you'); //write a response to the client
                    res.end(); //end the response
                }
            }
        })
    }).listen(8081); //the server object listens on port 8080

    function setNoActionTimeout() {
        return setTimeout(() => {
            console.log("\nNo recent action")
            getAutomaticNoActionSnapshot();
        }
        , automaticNoActionSnapshotInterval);
    }
}

