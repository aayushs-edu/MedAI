from flask import Flask, request, jsonify, render_template
import joblib  # or whichever library you used to save your model
import numpy as np
from transformers import pipeline, AutoModelForZeroShotImageClassification, AutoTokenizer, AutoImageProcessor
import threading
from rembg import remove
from io import BytesIO
from PIL import Image
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
    "fungal infection",
    "melanoma",
    "skin cancer",
    "rashes",
    "oily skin",
    "dry skin",
    "strep throat",
    "canker sore",
    "mucocele",
    "pink eye",
    "cataracts",
    "vitiligo",
    "warts"
]


# Load the model during startup
# def load_torch_model():
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
# Load the model during startup
def load_tf_model():
    global cnn
    with model_lock:
        if cnn is None:
            print("Loading model...")

            cnn = pipeline("zero-shot-image-classification", model="suinleelab/monet")

            print("Model loaded successfully!")


@app.route('/cnn', methods=['POST'])
def classify():
    global cnn
    if cnn is None:
        return jsonify({"message": "The model was not loaded, so please ask me to try again.", "probs": []})
    print("1")
    image_bytes = request.data
    image = Image.open(BytesIO(image_bytes))
    image = image.convert('RGB')

    intial_labels = [
        "throat",
        "skin",
        "lips",
        "eyes"
    ]

    with model_lock:
        category = cnn(image, candidate_labels=intial_labels)

    input_image = None
    print("Category: ", category[0]["label"], ", score: ", category[0]["score"])
    if category[0]["label"] == "skin":
        input_image = remove(image)
    else:
        input_image = image
    
    # Use the preloaded classifier
    with model_lock:  # Ensure thread-safe inference
        results = cnn(input_image, candidate_labels=candidate_labels)

    top3 = results[:3]
    response = {"message": "", "probs": top3}

    print("Results: ", results)

    if (results[0]["score"] > 0.55):
        response["message"]=f'I seem to have a {results[0]["label"]}, can you tell me how to fix it?'
    elif (results[0]["score"] > 0.20):
        response["message"]=f'I might have a {results[0]["label"]}, but I am not sure. It could also be {results[1]["label"]} Tell me that its a guess and I should see a specialist. Can you help me?'
    else:
        response["message"]='Can you tell me to provide a better image for you to diagnose and/or give me tips on how to stay healthy?'

    return jsonify(response)
        


@app.route('/cnn', methods=['GET'])
def get_cnn():
    if cnn is None:
        return jsonify({"error": "Model not loaded yet"}), 500
    else:
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

    response = {"message": "", "probs": top3_probabilities}

    # If mean probability is less than 0.05, do not append to all_user_messages
    if max_probability > 0.05:
        all_user_messages.append(user_message)
    else:
        response["message"] = user_message
        return jsonify(response)


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

    response = {"message": "", "probs": list(predictions.values())}

    if max_probability > 0.15:
        print("1")
        response["message"] = "Here are my diagnoses in order of likelihood: " + str(list(predictions.keys())) + ". Please explain as if I had given you my symptoms. Say 'Thank you for providing your symptoms. Here are the possible conditions you may have:' and then go over the different diagnoses. Mention that the last one is very low probability."
    elif len(all_user_messages) > 4:
        print('2')
        response["message"] = "Here is my unsure diagnosis: " + str(list(predictions.keys())) + ". Tell me that these are low probability because of less detail. Please ask me to provide more details related to: " + user_message
    else:
        print('3')
        print(user_message)
        response["message"] = "Here is my unsure diagnosis: " + str(list(predictions.keys())) + ". Tell me that these are low probability because of less detail. Please ask me to provide more details related to: " + user_message

    print("Response: ", response)
    return jsonify(response)

if __name__ == '__main__':
    threading.Thread(target=load_tf_model, daemon=True).start()
    app.run(debug=True)
