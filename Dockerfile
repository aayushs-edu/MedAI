FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install TensorFlow
RUN pip install --no-cache-dir tensorflow-cpu==2.12.0

# Add application code
WORKDIR /app
COPY . /app

# Install app dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set default command
CMD ["python", "app.py"]
