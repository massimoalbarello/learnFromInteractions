const sensors = require("./data-acquisition/retrieve_sensors_data");
const featFunctions = require("./features");



exports.getDataForPrediction = async function(databaseName, sensorsNearBy, noVPnearBy) {
    const streams = await sensors.retrieveData(VPcandidate="", databaseName, label=null, sensorsNearBy, noVPnearBy, usedForPrediction=true);
    // console.log(streams);
    const predictionTimestamp = Date.now();
    const features = featFunctions.computeFeatures({}, predictionTimestamp, streams);
    delete features[predictionTimestamp]["label"];  // the label will be predicted by the model
    // console.log(features);
    const datapoint = featFunctions.createDataset(features, training=false);
    return Object.values(datapoint[0]);
}