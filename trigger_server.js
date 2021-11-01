const http = require('http');



exports.listen = function(determineWhoTriggered) {
    http.createServer(function (req, res) {
        req.on('data', (data) => {
            data = JSON.parse(data);
            if (data.hasOwnProperty("sentFrom") && data["sentFrom"] === "sensorPi") {
                if (data["room"] === "r402") {
                    determineWhoTriggered(data);
                }
            }
        })
        res.write('Thank you'); //write a response to the client
        res.end(); //end the response
    }).listen(8080); //the server object listens on port 8080
}