// manager.js
exports.streamsDBname = "r_test_lamp_streams";     // name of the database used to store stream snapshots
exports.predictionsDBname = "r_test_lamp_predictions";  // name of the database used to store prediction and corresponding true lamp state
exports.candidate_actionTimeout = 10000;    // wait up to 10 seconds for a possible candidate after an action is triggered
exports.predictionInterval = 300000;     // interval after which the system makes a prediction based on the current data and model
exports.wrongPredicitonsTrainModelThreshold = 10;    // number of wrong predictions after which the model is retrained
exports.sensorsNearBy = [
    {
        id: "thunderboard_086bd7fe10cb",
        measurements: ["light", "humidity", "temperature", "uvi", "pressure"]
    },
    {
        id: "weather_station",
        measurements: ["light_level", "rain_intensity", "sun_azimuth", "sun_elevation", "sun_radiation", "temperature", "wind_speed"]
    }
];

// trigger_server.js
exports.automaticNoActionSnapshotInterval = 3600000;    // interval for periodic automatic snapshot until no action is triggered
exports.roomTrigger = "rtest";  // check if the action was triggered in this room

// scanner.js
exports.advSignalThreshold = -70;   // threshold to determine VPs near by
exports.checkVPnearByInterval = 20000;  // interval for periodic check of VP near by (no VP near by if not detected for this interval)
exports.checkRecentSnapshotsInterval = 40000;   // interval after which the three stored snapshots are considered too old to be used in average snapshot

// query_data.js
exports.room = "r400";   // room of the lamp from which the state is read for labaleling automatic no acion snapshot when VP near by (field of measurement "room_lamp_status")

// features.js
exports.measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action
exports.featuresNumber = 76;    // number of features computed from all streams

// getFeaturesFromStreams.js
exports.faultyDataDates = ["16,11", ]     // dates "dd,mm" in which faulty data was recorded (!!! months go from 0 (January) to 11 (December) !!!)



// general
exports.namesVP = {
    "14:b4:57:6d:a6:1f": "Kim",
    "14:b4:57:6d:a5:43": "Jannis",
    "14:b4:57:6d:a8:54": "Iori",
    "00:0d:6f:20:d3:11": "Ganesh",
    "00:0d:6f:20:d1:e2": "Andres",
    "00:0b:57:51:b2:24": "Simon",
    "00:0b:57:51:ca:9a": "Sanjiv",
    "00:0b:57:51:bd:de": "Kenan",
}
exports.storeOnDB = true;