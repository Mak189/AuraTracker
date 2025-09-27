# Use an official Python base image
FROM python:3.11-slim

# Set work directory inside the container
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Run the Flask app
CMD ["python", "app.py"]

