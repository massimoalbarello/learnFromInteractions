const sensors = require("./data-acquisition/retrieve_sensors_data");
const featFunctions = require("./features");



exports.getDataForPrediction = async function(databaseName, sensorsNearBy, noVPnearBy) {
    const streams = await sensors.retrieveData(VPcandidate="", databaseName, label=null, sensorsNearBy, noVPnearBy, usedForPrediction=true);
    // console.log(streams);
    const predictionTimestamp = Date.now();
    const featuresObj = featFunctions.computeFeatures({}, predictionTimestamp, streams);
    // console.log(featuresObj);
    const [features, ] = featFunctions.createDataset(featuresObj, training=false);  // the label will be predicted by the model
    return features;
}