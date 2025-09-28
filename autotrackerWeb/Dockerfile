# Use an official Python base image
#FROM python:3.11-slim

# Set work directory inside the container
#WORKDIR /app

# Install dependencies
#COPY requirements.txt .
#RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
#COPY . .

# Run the Flask app
#CMD ["python", "app.py"]
# Use an official Python base image

# -----------------------------
# Dockerfile for Flask + DeepFace + OpenCV
# -----------------------------

# Use a more complete Python base image (ARM-friendly)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install OpenCV system dependencies (ARM-friendly)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app code
COPY . .

# Expose Flask port
EXPOSE 5000

# Run the app
CMD ["python", "app.py"]

