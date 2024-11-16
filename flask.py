from flask import Flask, request, jsonify
import joblib  # or whichever library you used to save your model
import numpy as np

app = Flask(__name__)

# Load the model and TF-IDF vectorizer
model = joblib.load('naive_bayes_model.pkl')
tfidf = joblib.load('tfidf_vectorizer.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    # Get data from the request
    data = request.get_json()
    user_message = str(data['message'])
    
    # Transform new text data and make predictions
    new_text = [user_message]
    new_text_tfidf = tfidf.transform(new_text)

    # Get probabilities for each class
    probabilities = model.predict_proba(new_text_tfidf)

    # Get the indices of the top 3 highest probabilities
    top3_indices = np.argsort(probabilities[0])[-3:][::-1]

    # Get the class names (diagnoses) for the top 3 indices
    top3_diagnoses = [model.classes_[index] for index in top3_indices]
    top3_probabilities = [probabilities[0][index] for index in top3_indices]

    predictions = []
    # Print the top 3 diagnoses with their probabilities
    for diagnosis, prob in zip(top3_diagnoses, top3_probabilities):
        predictions.append(diagnosis)

    # Return the prediction as JSON
    return jsonify(predictions)
