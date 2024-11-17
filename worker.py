import torch
from transformers import pipeline, AutoModelForZeroShotImageClassification, AutoTokenizer, AutoImageProcessor
import time

# Global variable to share the model between worker and app
cnn = None

def load_model():
    global cnn
    print("Loading model...")
    model = AutoModelForZeroShotImageClassification.from_pretrained("suinleelab/monet")
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

if __name__ == "__main__":
    load_model()
