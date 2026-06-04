import json
import os
import time
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
from analyzer import analyze_email
from producer import publish_ai_result

KAFKA_SERVERS   = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
EMAIL_TOPIC     = os.getenv("KAFKA_TOPIC_EMAIL_RECEIVED", "email.received")
CONSUMER_GROUP  = "ai-service"

def start_consumer():
    # Retry khi Kafka chưa sẵn sàng
    while True:
        try:
            kafka_kwargs = {
                "bootstrap_servers": KAFKA_SERVERS,
                "group_id": CONSUMER_GROUP,
                "auto_offset_reset": "earliest",
                "value_deserializer": lambda m: json.loads(m.decode("utf-8")),
                "enable_auto_commit": True,
            }

            username = os.getenv("KAFKA_USERNAME")
            password = os.getenv("KAFKA_PASSWORD")
            api_version_env = os.getenv("KAFKA_API_VERSION")
            if api_version_env:
                kafka_kwargs["api_version"] = tuple(map(int, api_version_env.split(".")))
            elif username and password:
                # Bắt buộc set api_version khi dùng SASL_SSL (Aiven) để tránh kafka-python tự động probe
                # dẫn đến lỗi NoBrokersAvailable do Aiven block các request chưa xác thực.
                kafka_kwargs["api_version"] = (2, 5, 0)

            if username and password:
                import ssl
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                kafka_kwargs.update({
                    "security_protocol": "SASL_SSL",
                    "sasl_mechanism": "SCRAM-SHA-256",
                    "sasl_plain_username": username,
                    "sasl_plain_password": password,
                    "ssl_context": context,
                })

            consumer = KafkaConsumer(EMAIL_TOPIC, **kafka_kwargs)
            print(f"[Consumer] Đã kết nối Kafka, lắng nghe topic: {EMAIL_TOPIC}")
            break
        except NoBrokersAvailable:
            print(f"[Consumer] Kafka ({KAFKA_SERVERS}) chưa sẵn sàng hoặc sai thông tin bảo mật, thử lại sau 5s...")
            time.sleep(5)

    for message in consumer:
        try:
            data = message.value
            email_id = data["emailId"]
            subject  = data.get("subject", "")
            body     = data.get("body", "")
            user_id  = data.get("userId")
            received_at = data.get("receivedAt")

            print(f"[Consumer] Xử lý email {email_id}: {subject[:50]}")

            # Gọi Gemini (gộp trong 1 API call duy nhất)
            analysis = analyze_email(subject, body)
            label = analysis["label"]
            summary = analysis["summary"]
            replies = analysis["suggested_replies"]
            action_items = analysis["action_items"]

            # Publish kết quả về email-service
            publish_ai_result(email_id, label, summary, replies, action_items, user_id, received_at)

            # Delay 3s để tránh vượt quá RPM (15 RPM) của Gemini Free Tier khi xử lý batch email
            time.sleep(3)

        except Exception as e:
            print(f"[Consumer] Lỗi xử lý email: {e}")
            time.sleep(5)