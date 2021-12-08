// manager.js
exports.databaseName = "r_test_lamp_streams";     // name of the database used to store stream snapshots
exports.candidate_actionTimeout = 10000;    // wait up to 10 seconds for a possible candidate after an action is triggered
exports.trainModelInterval = 30000;     // interval after which the system trains a new model based on the data acquired so far
exports.predictionInterval = 30000;     // interval after which the system makes a prediction based on the current data and model
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
exports.automaticNoActionSnapshotInterval = 1800000;    // interval for periodic automatic snapshot until no action is triggered
exports.roomTrigger = "rtest";  // check if the action was triggered in this room

// scanner.js
exports.advSignalThreshold = -70;   // threshold to determine VPs near by
exports.checkVPnearByInterval = 20000;  // interval for periodic check of VP near by (no VP near by if not detected for this interval)
exports.checkRecentSnapshotsInterval = 40000;   // interval after which the three stored snapshots are considered too old to be used in average snapshot

// query_data.js
exports.room = "r400";   // room of the lamp from which the state is read for labaleling automatic no acion snapshot when VP near by (field of measurement "room_lamp_status")

// influx-db/getFeaturesFromStreams.js
exports.measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action



// general
exports.namesVP = {
    "14:b4:57:6d:a6:1f": "Kim",
    "14:b4:57:6d:a5:43": "Jannis",
    "14:b4:57:6d:a8:54": "Iori",
    "00:0d:6f:20:d3:11": "Ganesh",
    "00:0d:6f:20:d1:e2": "Andres"
}