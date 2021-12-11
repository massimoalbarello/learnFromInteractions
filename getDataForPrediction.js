const sensors = require("./data-acquisition/retrieve_sensors_data");
const featFunctions = require("./features");



exports.getDataForPrediction = async function(databaseName, sensorsNearBy, noVPnearBy) {
    const [stream, predictionTimestamp] = await sensors.retrieveData(VPcandidate="", databaseName, label=null, sensorsNearBy, noVPnearBy, usedForPrediction=true);
    // console.log(stream);
    if (stream != null) {
        const featuresObj = featFunctions.computeFeatures({}, predictionTimestamp, stream);
        // console.log(featuresObj);
        const [features, ] = featFunctions.createDataset(featuresObj, training=false);  // the label will be predicted by the model
        return [features, stream, predictionTimestamp];
    }
    else {
        return [null, null, null];
    }
    
}