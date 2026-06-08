import json
import os
import time
import queue
import threading
import re
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
from analyzer import analyze_emails_batch
from producer import publish_ai_result

KAFKA_SERVERS   = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
EMAIL_TOPIC     = os.getenv("KAFKA_TOPIC_EMAIL_RECEIVED", "email.received")
CONSUMER_GROUP  = "ai-service"

# Hàng đợi chứa các email cần phân tích gom lô
email_queue = queue.Queue()

# ── Cấu hình từ khóa hành động để phân loại task ──
ACTION_KEYWORDS = [
    "please review", "can you", "deadline", "by tomorrow",
    "cần bạn", "trước", "hạn", "họp", "meeting",
    "submit", "gửi lại", "xác nhận", "confirm",
    "fix", "check", "prepare", "chuẩn bị"
]

def has_action_item(subject: str, body: str) -> bool:
    text = f"{subject or ''} {body or ''}".lower()
    return any(kw in text for kw in ACTION_KEYWORDS)

SPAM_SENDERS = [
    r"newsletter@",
    r"noreply@promo",
    r"no-reply@promo",
    r"marketing@",
    r"promo@",
    r"promotion@",
    r"offers@",
    r"deals@",
    r"quangcao",
    r"advertisement",
    r"spam@",
]

SPAM_KEYWORDS = [
    r"\bkhuyen\s+mai\b",
    r"\bkhuyến\s+mãi\b",
    r"\bưu\s+đãi\b",
    r"\buu\s+dai\b",
    r"\bquảng\s+cáo\b",
    r"\bquang\s+cao\b",
    r"\bgiảm\s+giá\b",
    r"\bgiam\s+gia\b",
    r"\bcoupon\b",
    r"\bvoucher\b",
    r"\bmua\s+ngay\b",
    r"\bclick\s+here\b",
    r"\bunsubscribe\b",
    r"\bhủy\s+đăng\s+ký\b",
    r"\bhuy\s+dang\s+ky\b",
]

def pre_classify(from_address: str, from_name: str, subject: str, body: str) -> str:
    """
    Phân loại nhanh bằng luật (Rule-based pre-classification)
    Trả về 'SPAM' nếu chắc chắn là spam/quảng cáo, ngược lại trả về None
    """
    sender = f"{from_name or ''} <{from_address or ''}>".lower()
    subject = (subject or "").lower()
    body = (body or "").lower()

    # 1. Kiểm tra người gửi (sender)
    for pattern in SPAM_SENDERS:
        if re.search(pattern, sender):
            return "SPAM"

    # 2. Kiểm tra từ khóa trong tiêu đề và nội dung (unsubscribe, khuyến mãi...)
    if "unsubscribe" in body or "hủy đăng ký" in body or "huy dang ky" in body:
        return "SPAM"

    for pattern in SPAM_KEYWORDS:
        if re.search(pattern, subject) or re.search(pattern, body[:500]):
            return "SPAM"

    return None

def batch_worker():
    """
    Luồng chạy ngầm gộp lô email, xử lý lọc trùng luồng và gọi Gemini hàng loạt
    """
    print("[Worker] Luồng Batch Worker đang chạy...")
    while True:
        # Chờ 5 giây để gom đủ các email được gửi đồng loạt
        time.sleep(5)
        
        batch = []
        while not email_queue.empty():
            try:
                batch.append(email_queue.get_nowait())
            except queue.Empty:
                break
                
        if not batch:
            continue
            
        print(f"[Worker] Nhận lô gồm {len(batch)} email cần xử lý từ hàng đợi.")
        
        # 1. Lọc trùng luồng (Deduplicate by threadId)
        thread_groups = {}
        for msg in batch:
            t_id = msg.get("threadId")
            # Nếu không có threadId, coi như là một luồng độc lập
            if not t_id:
                t_id = f"no-thread-{msg.get('emailId')}"
            
            if t_id not in thread_groups:
                thread_groups[t_id] = []
            thread_groups[t_id].append(msg)
            
        emails_to_analyze = []
        emails_to_skip = []
        
        for t_id, msg_list in thread_groups.items():
            # Sắp xếp các email theo ID tăng dần
            msg_list.sort(key=lambda x: x.get("emailId", 0))
            
            # Email mới nhất trong thread được chọn để phân tích bằng AI
            latest_msg = msg_list[-1]
            emails_to_analyze.append(latest_msg)
            
            # Các email cũ hơn trong thread sẽ được đánh dấu bỏ qua phân tích AI
            for old_msg in msg_list[:-1]:
                emails_to_skip.append(old_msg)
                
        print(f"[Worker] Lọc trùng luồng: Cần phân tích {len(emails_to_analyze)} email mới nhất, bỏ qua {len(emails_to_skip)} email cũ trong luồng hội thoại.")
        
        # 2. Xử lý các email cần phân tích (phân lô nhỏ tối đa 15 email/lần gọi Gemini)
        chunk_size = 15
        for i in range(0, len(emails_to_analyze), chunk_size):
            chunk = emails_to_analyze[i:i+chunk_size]
            try:
                # Gọi Gemini API hàng loạt
                analysis_results = analyze_emails_batch(chunk)
                
                # Ánh xạ kết quả trả về theo emailId để dễ tra cứu
                results_by_id = {res.get("emailId"): res for res in analysis_results if "emailId" in res}
                
                for msg in chunk:
                    email_id = msg.get("emailId")
                    user_id = msg.get("userId")
                    received_at = msg.get("receivedAt")
                    subject = msg.get("subject", "")
                    body = msg.get("body", "")
                    
                    if email_id in results_by_id:
                        res = results_by_id[email_id]
                        label = res.get("label", "NORMAL").upper()
                        confidence = res.get("confidence", 1.0)
                        reason = res.get("reason", "")
                        
                        if confidence < 0.7:
                            print(f"[Worker] AI gán nhãn {label} với độ tin cậy thấp ({confidence} < 0.7, lý do: {reason}) cho email {email_id}. Hạ cấp về NORMAL.")
                            label = "NORMAL"
                        
                        summary = res.get("summary", "Đã phân tích hoàn tất.")
                        suggested_replies = res.get("suggested_replies", [])
                        
                        # Logic phân tầng quyết định tạo task
                        should_create = False
                        task_title = res.get("task_title", "")
                        
                        if label == "SPAM":
                            should_create = False
                        elif label in ["IMPORTANT", "URGENT"]:
                            should_create = res.get("should_create_task", False) or has_action_item(subject, body)
                        else: # NORMAL
                            should_create = res.get("should_create_task", False) and has_action_item(subject, body)
                        
                        if should_create and not task_title:
                            task_title = subject if subject else "Nhiệm vụ từ email"
                        
                        # Định dạng danh sách ActionItem từ đối tượng sang chuỗi ghép tương thích ngược
                        action_items = []
                        for item in res.get("action_items", []):
                            if isinstance(item, dict):
                                task = item.get("task", "")
                                due_date = item.get("due_date", "Không rõ")
                                priority = item.get("priority", "LOW")
                                action_items.append(f"[{priority.upper()}] [Hạn: {due_date}] {task}")
                            else:
                                action_items.append(str(item))
                                
                        publish_ai_result(email_id, label, summary, suggested_replies, action_items, user_id, received_at, should_create, task_title)
                    else:
                        # Fallback nếu AI bỏ sót emailId trong kết quả trả về của lô
                        print(f"[Worker] Cảnh báo: AI bỏ sót kết quả cho emailId {email_id}")
                        publish_ai_result(
                            email_id, 
                            "NORMAL", 
                            "Lỗi: AI bỏ sót kết quả phân tích cho email này trong lượt xử lý hàng loạt.", 
                            [], [], user_id, received_at, False, None
                        )
            except Exception as e:
                print(f"[Worker] Lỗi nghiêm trọng khi phân tích lô: {e}")
                # Fallback: Trả kết quả mặc định cho toàn bộ lô bị lỗi để tránh treo trạng thái PENDING
                for msg in chunk:
                    publish_ai_result(
                        msg.get("emailId"), "NORMAL", 
                        "Không thể phân tích do lỗi hệ thống AI.", 
                        [], [], msg.get("userId"), msg.get("receivedAt"), False, None
                    )
            
            # Tránh Rate Limit của Gemini giữa các sub-batch
            time.sleep(2)
            
        # 3. Trả về nhãn mặc định cho các email cũ bị bỏ qua để giải phóng trạng thái PENDING
        for msg in emails_to_skip:
            publish_ai_result(
                msg.get("emailId"), 
                "NORMAL", 
                "Tự động bỏ qua phân tích (đã có thư mới hơn trong luồng hội thoại).", 
                [], [], 
                msg.get("userId"), 
                msg.get("receivedAt"), False, None
            )


def start_consumer():
    # Khởi chạy Worker Thread gom lô chạy ngầm
    t = threading.Thread(target=batch_worker, daemon=True)
    t.start()

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
            print(f"[Consumer] Nhận yêu cầu phân tích email {email_id}: {subject[:50]}")
            
            # Chạy Rule-based pre-classification trước
            from_address = data.get("fromAddress", "")
            from_name = data.get("fromName", "")
            body = data.get("body", "")
            
            rule_label = pre_classify(from_address, from_name, subject, body)
            if rule_label == "SPAM":
                print(f"[Consumer] Phát hiện spam bằng bộ lọc luật cho email {email_id}. Gửi thẳng kết quả nhãn SPAM.")
                publish_ai_result(
                    email_id=email_id,
                    label="SPAM",
                    summary="Email spam (Phát hiện tự động bằng bộ lọc hệ thống).",
                    suggested_replies=[],
                    action_items=[],
                    user_id=data.get("userId"),
                    received_at=data.get("receivedAt"),
                    should_create_task=False,
                    task_title=None
                )
                continue
            
            # Đẩy tin nhắn vào hàng đợi để gộp lô chạy ngầm
            email_queue.put(data)

        except Exception as e:
            print(f"[Consumer] Lỗi nhận tin nhắn từ Kafka: {e}")
            time.sleep(5)