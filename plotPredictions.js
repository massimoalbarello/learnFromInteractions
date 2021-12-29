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
    
    var lastDate = new Date(predictionTimestamps[0])
    var lastDay = lastDate.getDate();
    var predictionsDate = [];
    var accuraciesDates = [];
    var accs = [];
    var tot = 1;
    var count = predictions[0] == correctStates[0] ? 1 : 0;
    var i = 1;

    for (const predictionTimestamp of predictionTimestamps.slice(1)) {
        const date = new Date(predictionTimestamp);
        if (date.getDate() == lastDay) {
            tot += 1;
            count += predictions[i] == correctStates[i] ? 1 : 0;
        }
        else {
            accs.push(count/tot);
            accuraciesDates.push(lastDate);
            console.log("[" + lastDate.getDate() + "/" + lastDate.getMonth() + "]: " + count + "/" + tot + " => " + count/tot);
            lastDate = date;
            lastDay = lastDate.getDate();
            tot = 1;
            count = predictions[i] == correctStates[i] ? 1 : 0;
        }
        i += 1;
        predictionsDate.push(date);
    }
    accs.push(count/tot);
    accuraciesDates.push(lastDate);
    console.log("[" + lastDate.getDate() + "/" + lastDate.getMonth() + "]: " + count + "/" + tot + " => " + count/tot);
    plotFunction(predictions, correctStates, predictionsDate, "Predictions and correct states plot");
    plotFunction(accs, [], accuraciesDates, "Daily accuracy of predictions");
}

main();