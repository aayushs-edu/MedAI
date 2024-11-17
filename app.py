from flask import Flask, request, jsonify, render_template
import joblib  # or whichever library you used to save your model
import numpy as np
from io import BytesIO
from PIL import Image
import requests

app = Flask(__name__)

# NAIVE BAYES
model = joblib.load('naive_bayes_model.pkl')
tfidf = joblib.load('tfidf_vectorizer.pkl')

all_user_messages = []

# CNN

MODEL_SERVICE_URL = "http://model_service:5001/cnn"

# # Load the model during startup
# def load_model():
#     global cnn
#     with model_lock:
#         if cnn is None:
#             print("Loading model...")

#             model = AutoModelForZeroShotImageClassification.from_pretrained(
#                 "suinleelab/monet"
#             )
#             tokenizer = AutoTokenizer.from_pretrained("suinleelab/monet")
#             image_processor = AutoImageProcessor.from_pretrained("suinleelab/monet")

#             # Apply dynamic quantization
#             quantized_model = torch.quantization.quantize_dynamic(
#                 model, {torch.nn.Linear}, dtype=torch.qint8
#             )

#             # Create the pipeline with the quantized model
#             cnn = pipeline(
#                 "zero-shot-image-classification",
#                 model=quantized_model,
#                 tokenizer=tokenizer,
#                 image_processor=image_processor
#             )

#             print("Model loaded successfully!")


@app.route('/cnn', methods=['POST'])
def classify():
    print("CNN classifying...")
    
    results = requests.post(MODEL_SERVICE_URL, files={"image": request.data}).json()

    print("Results: ", results)

    return jsonify(results)


@app.route('/cnn', methods=['GET'])
def get_cnn():
    return requests.get(MODEL_SERVICE_URL).json()
    

@app.route("/")
def serve_index():
    return render_template('index.html')

@app.route('/reset', methods=['POST'])
def reset():
    all_user_messages.clear()
    print("All messages have been cleared: ", all_user_messages)
    return jsonify({"message": "All messages have been cleared."})

@app.route('/nb', methods=['POST'])
def diagnose():
    # Get data from the request
    data = request.get_json()
    user_message = data
    print("Received message:", user_message)

    # Run RB for only this message
    new_text = [user_message]
    new_text_tfidf = tfidf.transform(new_text)

    # Get probabilities for each class
    probabilities = model.predict_proba(new_text_tfidf)

    # Get the indices of the top 3 highest probabilities
    top3_indices = np.argsort(probabilities[0])[-3:][::-1]

    # Get the class names (diagnoses) for the top 3 indices
    top3_diagnoses = [model.classes_[index] for index in top3_indices]
    top3_probabilities = [probabilities[0][index] for index in top3_indices]
    
    print("Model results for this message: ", top3_diagnoses, top3_probabilities)

    # Calculate the mean probability
    max_probability = np.max(probabilities)

    # If mean probability is less than 0.05, do not append to all_user_messages
    if max_probability > 0.05:
        all_user_messages.append(user_message)
    else:
        return jsonify(user_message)


    # All symptoms as string
    all_symptoms = ' '.join(all_user_messages)
    print("All symptoms: ", all_symptoms)
    
    # Transform new text data and make predictions
    new_text = [all_symptoms]
    new_text_tfidf = tfidf.transform(new_text)

    # Get probabilities for each class
    probabilities = model.predict_proba(new_text_tfidf)

    # Get the indices of the top 3 highest probabilities
    top3_indices = np.argsort(probabilities[0])[-3:][::-1]

    # Get the class names (diagnoses) for the top 3 indices
    top3_diagnoses = [model.classes_[index] for index in top3_indices]
    top3_probabilities = [probabilities[0][index] for index in top3_indices]

    predictions = {}
    # Print the top 3 diagnoses with their probabilities
    for diagnosis, prob in zip(top3_diagnoses, top3_probabilities):
        predictions.update({str(diagnosis): float(prob)})

    # Sort predictions by value in descending order
    sorted_predictions = dict(sorted(predictions.items(), key=lambda item: item[1], reverse=True))
    predictions = sorted_predictions

    print("Model results for all symptoms: ", predictions)

    # # Check if all top 3 probabilities are lower than 10%
    # if all(prob < 0.1 for prob in top3_probabilities):
    #     return jsonify(user_message)
    
    # Return the prediction as JSON
    max_probability = np.max(top3_probabilities)
    if max_probability > 0.15:
        return jsonify("Here are my diagnoses in order of likelihood: " + str(list(predictions.keys())) + ". Please explain as if I had given you my symptoms. Say 'Thank you for providing your symptoms. Here are the possible conditions you may have:' and then go over the different diagnoses.")
    elif len(all_user_messages) > 3:
        return jsonify("Here is my unsure diagnosis: " + str(list(predictions.keys())[0]) + ". Please explain as if I had given you my symptoms. Say 'Thank you for providing your symptoms. Here are the possible conditions you may have:' and then go over the different diagnoses.")
    else:
        return jsonify(user_message)
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
