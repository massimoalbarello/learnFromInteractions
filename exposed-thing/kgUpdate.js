const jsonfile = require('jsonfile');

const knowledgeGraphFile = 'knowledgeGraph.json'

// this program should be waiting for new possible updates of the knowledge graph based on explicit knowledge found in omniaApps and implicit knowledge that can be extracted from snapshots
const main = async () => {
    let knowledgeGraph = await jsonfile.readFile(knowledgeGraphFile)
    // console.log(knowledgeGraph);

    // when an omniaApp uses the data of one device to control another, we learn that one device can control the other and so we can update the knowledge graph
    // our APIs that developer use to write an omniaApp should be such that they explain the relationships between devices, i.e. which device controls which
    // suppose that thanks to an omniaApp we learned that a particular button can control a particular led, then we can update the knowledge graph
    // canBeToggledBy and canToggle should be substituted by words of a proper ontology in order to standardize the relationships between Things
    knowledgeGraph["led"]["canBeToggledBy"] = knowledgeGraph["button"]["_id"]
    knowledgeGraph["button"]["canToggle"] = knowledgeGraph["led"]["_id"]
    jsonfile.writeFile(knowledgeGraphFile, knowledgeGraph);
    console.log(knowledgeGraph)

    // here is where the ML application will tell us which sensors' values are correlated with each other
}

main()