from preprocessing import importDataset
from sklearn import svm
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score



datasetName = "dataset.csv"

features, labels, scaler = importDataset(datasetName)

models = [("support vector", svm.SVC(kernel='linear', C=1, random_state=0)), ("random forest", RandomForestClassifier(max_depth=50, random_state=0))]

for modelName, clf in models:  
    scores = cross_val_score(clf, features, labels, cv=5)
    print("\n" + modelName + ": %0.2f accuracy with a standard deviation of %0.2f" % (scores.mean(), scores.std()))

print()