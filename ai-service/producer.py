import json
import os
from kafka import KafkaProducer

_producer = None

def get_producer():
    global _producer
    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
    return _producer

AI_RESULT_TOPIC = os.getenv("KAFKA_TOPIC_AI_RESULT", "ai.result")

def publish_ai_result(email_id: int, label: str,
                      summary: str, suggested_replies: list):
    message = {
        "emailId": email_id,
        "label": label,
        "summary": summary,
        "suggestedReplies": suggested_replies,
    }
    p = get_producer()
    p.send(AI_RESULT_TOPIC,
           key=str(email_id),
           value=message)
    p.flush()
    print(f"[Producer] Published AI result cho email {email_id}: {label}")