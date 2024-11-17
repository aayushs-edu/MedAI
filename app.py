from flask import Flask, request, jsonify, render_template
import joblib  # or whichever library you used to save your model
import numpy as np
from transformers import pipeline
import threading
from rembg import remove
from io import BytesIO
from PIL import Image
import os
import base64

app = Flask(__name__)

# NAIVE BAYES
model = joblib.load('naive_bayes_model.pkl')
tfidf = joblib.load('tfidf_vectorizer.pkl')

all_user_messages = []

# CNN
cnn = None
model_lock = threading.Lock()
candidate_labels = [
    "acne",
    "eczema",
    "psoriasis",
    "dermatitis",
    "rosacea",
    "fungal infection",
    "melanoma",
    "skin cancer",
    "rashes",
    "cellulitis",
    "keratosis",
    "oily skin",
    "dry skin",
    "strep throat",
    "canker sore",
    "mucocele",
    "ucler",
    "pink eye",
    "cataracts",
    "vitiligo"
]

# Load the model during startup
def load_model():
    global cnn
    with model_lock:
        if cnn is None:
            print("Loading model...")
            cnn = pipeline("zero-shot-image-classification", model="suinleelab/monet")
            print("Model loaded successfully!")
def base64_to_bytesio(base64_string):
    if isinstance(base64_string, bytes):
        base64_string = base64_string.decode('utf-8')
    # Remove the "data:image/jpeg;base64," or similar prefix (if it exists)

    base64_string = base64_string.split(',')[1]
    
    # Log the length of the base64 string to ensure it's complete
    print(f"Base64 string length: {len(base64_string)}")
    print(f"Base64 preview: {base64_string[:100]}...")  # Print a small portion of the string for debugging

    # Decode the base64 string to binary data
    try:
        image_data = base64.b64decode(base64_string)
    except Exception as e:
        print(f"Error decoding base64: {e}")
        return None
    # Use BytesIO to create an in-memory file-like object
    try:
        # Decode and verify image
        image_bytesio = BytesIO(image_data)
        image = Image.open(image_bytesio)
        image.verify()
        print("Image is valid!")
    except Exception as e:
        print(f"Error: {e}")
        return None
    # Return the BytesIO object (the image data in memory)
    return image_bytesio
@app.route('/cnn', methods=['POST'])
def classify():
    global cnn
    if cnn is None:
        return jsonify({"error": "Model not loaded yet"}), 500
    print("1")
    image_bytes = request.data
    image = Image.open(BytesIO(image_bytes))

    intial_labels = [
        "throat",
        "skin",
        "lips",
        "eyes"
    ]

    with model_lock:
        category = cnn(image, candidate_labels=intial_labels)

    input_image = None
    print("Category: ", category[0]["label"])
    if category[0]["label"] == "throat" or category[0]["label"] == "lips" or category[0]["label"] == "eyes":
        input_image = image
    else:
        input_image = remove(image)
    
    # Use the preloaded classifier
    with model_lock:  # Ensure thread-safe inference
        results = cnn(input_image, candidate_labels=candidate_labels)

    print("Results: ", results)

    if (results[0]["score"] > 0.70):
        return jsonify('I seem to have a ', results[0]["label"], ', can you tell me how to fix it?') 
    elif (results[0]["score"] > 0.50):
        return jsonify('I might have a', results[0]["label"], ', but I am not sure, Can you help me?')
    else:
        return jsonify('Tell me that the image looks fine and to provide a better image.')
        


@app.route('/cnn', methods=['GET'])
def get_cnn():
    global cnn
    if cnn is None:
        return jsonify({"error": "Model not loaded yet"}), 500
    else :
        return jsonify({"message": "Model is loaded."})
    

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
    threading.Thread(target=load_model, daemon=True).start()
    app.run(debug=True)
