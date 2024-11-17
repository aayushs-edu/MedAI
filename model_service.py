from flask import Flask, request, jsonify, render_template
from transformers import pipeline, AutoModelForZeroShotImageClassification, AutoTokenizer, AutoImageProcessor
import threading
from rembg import remove
from io import BytesIO
from PIL import Image
import torch

app = Flask(__name__)

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

            model = AutoModelForZeroShotImageClassification.from_pretrained(
                "suinleelab/monet"
            )
            tokenizer = AutoTokenizer.from_pretrained("suinleelab/monet")
            image_processor = AutoImageProcessor.from_pretrained("suinleelab/monet")

            # Apply dynamic quantization
            quantized_model = torch.quantization.quantize_dynamic(
                model, {torch.nn.Linear}, dtype=torch.qint8
            )

            # Create the pipeline with the quantized model
            cnn = pipeline(
                "zero-shot-image-classification",
                model=quantized_model,
                tokenizer=tokenizer,
                image_processor=image_processor
            )

            print("Model loaded successfully!")

@app.route('/cnn', methods=['POST'])
def classify():
    global cnn
    if cnn is None:
        return jsonify({"error": "Model not loaded yet"}), 500
    print("1")
    image_bytes = request.files["image"].read()
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

    if (results[0]["score"] > 0.50):
        return jsonify(f'I seem to have a {results[0]["label"]} can you tell me how to fix it?') 
    elif (results[0]["score"] > 0.15):
        return jsonify(f'I might have a {results[0]["label"]}, but it could also be a {results[1]["label"]} Can you tell me how to treat it?')
    else:
        return jsonify('There seems to be nothing wrong with the image I gave you. Can you tell me how to stay healthy?')
  


@app.route('/cnn', methods=['GET'])
def get_cnn():
    global cnn
    if cnn is None:
        return jsonify({"error": "Model not loaded yet"}), 500
    else :
        return jsonify({"message": "Model is loaded."})
    
if __name__ == '__main__':
    threading.Thread(target=load_model, daemon=True).start()
    app.run(host='0.0.0.0', port=5001)