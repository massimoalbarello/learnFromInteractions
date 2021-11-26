const http = require('http');



exports.listen = function(determineWhoTriggered, getAutomaticNoActionSnapshot, stopAutomaticNoActionSnapshotTimeout) {

    const automaticSnapshotInterval = 30000;  // interval for periodic automatic snapshot until no action is triggered
    var noActionTimeout = setNoActionTimeout();

    http.createServer(function (req, res) {
        req.on('data', (data) => {
            data = JSON.parse(data);
            if (data.hasOwnProperty("sentFrom") && data["sentFrom"] === "sensorPi") {
                if (data["room"] === "r402") {
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
        , automaticSnapshotInterval);
    }
}

