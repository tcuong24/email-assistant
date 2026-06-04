import json
import os
from kafka import KafkaProducer

_producer = None

def get_producer():
    global _producer
    if _producer is None:
        kafka_kwargs = {
            "bootstrap_servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            "value_serializer": lambda v: json.dumps(v).encode("utf-8"),
            "key_serializer": lambda k: k.encode("utf-8") if k else None,
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

        _producer = KafkaProducer(**kafka_kwargs)
    return _producer

AI_RESULT_TOPIC = os.getenv("KAFKA_TOPIC_AI_RESULT", "ai.result")

def publish_ai_result(email_id: int, label: str,
                      summary: str, suggested_replies: list, action_items: list,
                      user_id: int = None, received_at: str = None):
    message = {
        "emailId": email_id,
        "label": label,
        "summary": summary,
        "suggestedReplies": suggested_replies,
        "actionItems": action_items,
        "userId": user_id,
        "receivedAt": received_at,
    }
    p = get_producer()
    p.send(AI_RESULT_TOPIC,
           key=str(email_id),
           value=message)
    p.flush()
    print(f"[Producer] Published AI result cho email {email_id}: {label}")