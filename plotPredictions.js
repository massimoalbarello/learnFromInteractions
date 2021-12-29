const plotlib = require('nodeplotlib');

const influxQuery = require('./influx-db/query_data');
const settings = require("./settings");



const predictionsDBname = settings.predictionsDBname;

function plotFunction(predictions, correctStates, timestamps, title) {
    const data = [ {
        x: timestamps,
        y: predictions,
        type: 'scatter',
        name: 'Predictions',
    },
    {
        x: timestamps,
        y: correctStates,
        type: 'scatter',
        name: 'Correct states',
    } ];
    const layout = {
        title: title
    } 

    plotlib.plot(data, layout);
}

async function main() {
    const [predictions, correctStates, predictionTimestamps] = await influxQuery.getPredictions(predictionsDBname, "");
    var dates = [];
    for (const predictionTimestamp of predictionTimestamps) {
        dates.push(new Date(predictionTimestamp));
    }
    plotFunction(predictions, correctStates, dates, "Predictions and correct states plot");

}

main();