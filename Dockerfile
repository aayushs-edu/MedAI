FROM python:3.10-slim

# Install required packages
RUN pip install --no-cache-dir flask joblib numpy scikit-learn pillow transformers torch flask rembg

# Copy the app
WORKDIR /app
COPY . .

# Expose port and run the Flask app
EXPOSE 5000
CMD ["python", "app.py"]