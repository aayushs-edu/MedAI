from flask import Flask, request, jsonify
import joblib  # or whichever library you used to save your model

app = Flask(__name__)

# Load your trained model
model = joblib.load('.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()  # Get JSON data sent by frontend
    # Preprocess data and make prediction
    prediction = model.predict([data['input_data']])
    return jsonify({'prediction': prediction[0]})
