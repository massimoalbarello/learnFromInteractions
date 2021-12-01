import pandas as pd
from sklearn import preprocessing
from sklearn.utils import shuffle
from impyute.imputation.cs import fast_knn
import numpy as np



def importDataset(dataset):
    df = pd.read_csv("./omnia/" + dataset)
    df = shuffle(df)    # shuffling dataset rows

    features = df.iloc[:, 1:]
    labels = df.iloc[:, 0]

    assert labels.shape[0] == features.shape[0], "number of features does not match the number of labels"
    
    imputedFeatures = fast_knn(np.array(features), k=30)    # imputing missing features using K nearest neighbors
    # np.savetxt("./omnia/imputedFeatures.csv", imputedFeatures, delimiter=",")
    scaler = preprocessing.StandardScaler().fit(imputedFeatures)   # scaler used to standardize both training set and the features that will be used during the prediction
    scaledFeatures = scaler.transform(imputedFeatures)

    return scaledFeatures, labels, scaler