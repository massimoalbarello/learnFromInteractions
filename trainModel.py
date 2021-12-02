from preprocessing import importDataset
from sklearn import svm
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
import pickle



datasetName = "dataset.csv"

features, labels, scaler = importDataset(datasetName)

models = [("support_vector", svm.SVC(kernel='linear', C=1, random_state=0)), ("random_forest", RandomForestClassifier(max_depth=5, random_state=0))]

for modelName, clf in models:
    fittedModel = clf.fit(features, labels)
    # scores = cross_val_score(clf, features, labels, cv=5)
    # print("\n" + modelName + ": %0.2f accuracy with a standard deviation of %0.2f" % (scores.mean(), scores.std()))
    pickle.dump(fittedModel, open("./omnia/models/" + modelName + ".pkl", 'wb'))

print("")