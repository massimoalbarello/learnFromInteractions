// manager.js
exports.lampInThisRoom = "r_400_lamp";
exports.candidate_actionTimeout = 10000;    // wait up to 10 seconds for a possible candidate after an action is triggered
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
exports.automaticNoActionSnapshotInterval = 18000000;    // interval for periodic automatic snapshot until no action is triggered
exports.room = "r400";

// scanner.js
exports.advSignalThreshold = -70;   // threshold to determine VPs near by
exports.checkVPnearByInterval = 20000;  // interval for periodic check of VP near by
exports.checkRecentSnapshotsInterval = 40000;   // interval after which the three stored snapshots are considered too old to be used in average snapshot
exports.updateVPhistoryInterval = 1;

// query_data.js
exports.room = "r400";   // lamp from which the state is read for labaleling automatic no acion snapshot when VP near by

// influx-db/getFeaturesFromStreams.js
exports.measurementsRightBeforeAction = 3;    // number of measurements considered as "right before" the action
exports.database = "r_400_lamp_streams";
