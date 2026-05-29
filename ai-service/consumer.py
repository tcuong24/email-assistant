import json
import os
import time
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
from classifier import classify
from summarizer import summarize
from reply_suggester import suggest_replies
from producer import publish_ai_result

KAFKA_SERVERS   = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
EMAIL_TOPIC     = os.getenv("KAFKA_TOPIC_EMAIL_RECEIVED", "email.received")
CONSUMER_GROUP  = "ai-service"

def start_consumer():
    # Retry khi Kafka chưa sẵn sàng
    while True:
        try:
            consumer = KafkaConsumer(
                EMAIL_TOPIC,
                bootstrap_servers=KAFKA_SERVERS,
                group_id=CONSUMER_GROUP,
                auto_offset_reset="earliest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                enable_auto_commit=True,
            )
            print(f"[Consumer] Đã kết nối Kafka, lắng nghe topic: {EMAIL_TOPIC}")
            break
        except NoBrokersAvailable:
            print("[Consumer] Kafka chưa sẵn sàng, thử lại sau 5s...")
            time.sleep(5)

    for message in consumer:
        try:
            data = message.value
            email_id = data["emailId"]
            subject  = data.get("subject", "")
            body     = data.get("body", "")

            print(f"[Consumer] Xử lý email {email_id}: {subject[:50]}")

            # Gọi Gemini
            label   = classify(subject, body)
            summary = summarize(subject, body) if label != "SPAM" else "Email spam."
            replies = suggest_replies(subject, body) if label != "SPAM" else []

            # Publish kết quả về email-service
            publish_ai_result(email_id, label, summary, replies)

        except Exception as e:
            print(f"[Consumer] Lỗi xử lý email: {e}")