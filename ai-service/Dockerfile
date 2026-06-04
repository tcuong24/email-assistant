FROM python:3.11-slim
WORKDIR /app

# Configure environment variables for real-time logs and timezone
ENV PYTHONUNBUFFERED=1
ENV TZ=Asia/Ho_Chi_Minh

# Install tzdata for system timezone support
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8085
CMD ["python", "main.py"]