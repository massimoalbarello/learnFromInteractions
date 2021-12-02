import sys
import pickle
import numpy as np

for datapoint in sys.stdin:
    datapoint = np.array(datapoint.split(',')).astype(np.float)
    model = pickle.load(open("./omnia/models/random_forest.pkl", 'rb'))
    prediction = model.predict([datapoint])
    print(prediction)