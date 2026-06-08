import google.generativeai as genai
import os
import json
import re
import time
from google.api_core.exceptions import ResourceExhausted, NotFound
from pydantic import BaseModel, Field
from typing import List, Optional

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODELS_POOL = [
    "gemini-3.1-flash-lite",  # Hàng ưu tiên 1: Tiết kiệm nhất thế hệ mới
    "gemini-2.5-flash-lite",  # Hàng ưu tiên 2: Tiết kiệm nhất thế hệ cũ
    "gemini-2.5-flash",       # Hàng ưu tiên 3: Ổn định, quota rất rộng
    "gemini-3.5-flash"        # Hàng ưu tiên 4: Frontier Flash
]

# 1. Định nghĩa cấu trúc Pydantic cho Action Item
class ActionItem(BaseModel):
    task: str = Field(description="Mô tả công việc cần làm ngắn gọn bằng tiếng Việt")
    due_date: str = Field(description="Hạn chót cụ thể được nhắc đến trong email hoặc luồng hội thoại. Định dạng dưới dạng ngày cụ thể (ví dụ: '12/06/2026') hoặc tương đối ('hôm nay', 'ngày mai'). Nếu không rõ hoặc không có hạn chót, ghi 'Không rõ'")
    priority: str = Field(description="Độ ưu tiên của công việc dựa trên mức độ khẩn cấp trong email: HIGH, MEDIUM, LOW")

# 2. Định nghĩa cấu trúc phân tích cho một email lẻ
class EmailAnalysisItem(BaseModel):
    emailId: int = Field(description="ID của email được cung cấp trong đầu vào")
    label: str = Field(description="Phân loại nhãn của email: SPAM (quảng cáo bẩn, rác, lừa đảo), URGENT (cực kỳ khẩn cấp cần xử lý ngay), IMPORTANT (công việc quan trọng thường nhật), NORMAL (thông thường khác)")
    summary: str = Field(description="Tóm tắt nội dung email tối đa 2 câu ngắn gọn bằng tiếng Việt. Nếu là SPAM thì ghi 'Email spam.'")
    action_items: List[ActionItem] = Field(description="Danh sách các việc cần làm trích xuất được từ email, hoặc mảng rỗng [] nếu không có hoặc là SPAM")
    suggested_replies: List[str] = Field(description="Gợi ý 3 câu trả lời ngắn gọn bằng tiếng Việt, hoặc mảng rỗng [] nếu là SPAM")
    should_create_task: bool = Field(description="True nếu email chứa công việc hoặc yêu cầu hành động rõ ràng và cần tạo task quản lý, ngược lại là False. Nếu là SPAM thì luôn ghi False")
    task_title: Optional[str] = Field(description="Nếu should_create_task là True, hãy tóm tắt việc cần làm thành 1 câu tiêu đề ngắn gọn tiếng Việt (tối đa 10 từ). Ngược lại là chuỗi rỗng ''")

# 3. Định nghĩa cấu trúc danh sách kết quả trả về của một Batch
class BatchAnalysisResponse(BaseModel):
    results: List[EmailAnalysisItem]


def clean_email_body_history(body: str) -> str:
    """
    Cắt bỏ phần trích dẫn thư cũ (reply history) và làm sạch HTML để tối ưu token đầu vào
    """
    if not body:
        return ""
    
    # 1. Làm sạch HTML tags
    clean = re.sub(r'<[^>]*>', '', body)
    
    # 2. Tách dòng để lọc lịch sử thư cũ
    clean_lines = []
    for line in clean.split('\n'):
        # Bỏ qua các dòng bắt đầu bằng ký tự trích dẫn '>'
        if line.strip().startswith('>'):
            continue
        
        # Nhận diện tiêu đề trích dẫn thư trả lời cũ (email reply headers)
        if re.match(r'^\s*On\s+.*\s+wrote:\s*$', line, re.IGNORECASE):
            break
        if re.match(r'^\s*-+\s*Original Message\s*-+\s*$', line, re.IGNORECASE):
            break
        
        clean_lines.append(line)
        
    # 3. Chuẩn hóa khoảng trắng
    return re.sub(r'\s+', ' ', '\n'.join(clean_lines)).strip()


def analyze_emails_batch(emails: List[dict]) -> List[dict]:
    """
    Phân tích một danh sách email gộp (Batch) trong 1 cuộc gọi API duy nhất, sử dụng Structured Output.
    """
    if not emails:
        return []

    emails_formatted = ""
    for email in emails:
        email_id = email.get("emailId", 0)
        subject = email.get("subject", "")
        body = email.get("body", "")
        received_at = email.get("receivedAt", "")
        thread_context = email.get("threadContext", "")

        # Làm sạch nội dung email và giới hạn độ dài thân thư để tối ưu hóa token đầu vào
        body_clean = clean_email_body_history(body)[:1500]

        emails_formatted += f"\n---\nEMAIL ID: {email_id}\n"
        if received_at:
            emails_formatted += f"Received At: {received_at}\n"
        if thread_context:
            emails_formatted += f"Conversation History (Lịch sử các thư cũ trước đó trong luồng):\n{thread_context}\n"
        emails_formatted += f"Subject (Tiêu đề): {subject}\n"
        emails_formatted += f"Body (Thân thư mới nhất): {body_clean}\n"

    prompt = f"""Bạn là AI trợ lý phân tích email chuyên nghiệp. Hãy phân tích danh sách các email dưới đây.
Với mỗi email, bạn cần thực hiện các tác vụ sau:
1. Phân loại theo mức độ ưu tiên cá nhân (label): Chọn một trong: SPAM, URGENT, IMPORTANT, NORMAL.
2. Tóm tắt nội dung (summary) tối đa 2 câu ngắn gọn bằng tiếng Việt. Nếu là SPAM thì ghi 'Email spam.'
3. Trích xuất đầu việc cần làm (action_items): 
   - Với mỗi công việc, xác định mô tả (task), độ ưu tiên (priority: HIGH, MEDIUM, LOW), và hạn hoàn thành (due_date) nếu được nhắc đến trong email hoặc lịch sử trò chuyện. Đối chiếu với ngày nhận thư (Received At) to tính toán hạn chót tương đối (ví dụ nếu nhận thư ngày '2026-06-08' là thứ Hai, và email ghi 'trước thứ Tư tuần này' thì do_date là '10/06/2026'). Nếu không có ngày cụ thể hoặc không rõ, trả về 'Không rõ'.
4. Gợi ý 3 câu trả lời ngắn gọn (suggested_replies) bằng tiếng Việt. Nếu là SPAM, trả về mảng rỗng [].
5. Xác định nên tạo task hay không (should_create_task): Đặt là True nếu email có chứa yêu cầu/công việc cần hành động rõ ràng từ người nhận. Email SPAM (quảng cáo, khuyến mãi, newsletter) hoặc email thông báo tự động (OTP, xác nhận giao dịch) thì luôn đặt là False.
6. Tóm tắt tiêu đề task (task_title): Nếu should_create_task là True, hãy tạo một tiêu đề task cực kỳ ngắn gọn bằng tiếng Việt (tối đa 10 từ) tóm tắt công việc cần làm. Nếu False, trả về chuỗi rỗng "".

Hãy sử dụng thông tin trong Conversation History (Lịch sử các thư cũ) nếu có để nắm bắt ngữ cảnh hội thoại đầy đủ khi phân tích thư mới nhất trong luồng đó.

Danh sách email cần phân tích:
{emails_formatted}
"""

    for model_name in MODELS_POOL:
        try:
            print(f"Đang phân tích Batch ({len(emails)} email) bằng model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": BatchAnalysisResponse
                }
            )
            
            result = json.loads(response.text.strip())
            return result.get("results", [])
        except ResourceExhausted:
            print(f"Cảnh báo: Model {model_name} đã hết quota. Đợi 5 giây trước khi thử model tiếp theo...")
            time.sleep(5)
            continue
        except NotFound:
            print(f"Cảnh báo: Model {model_name} không tồn tại hoặc đã bị gỡ bỏ. Đang chuyển model...")
            continue
        except Exception as e:
            print(f"Lỗi khi gọi model {model_name} cho Batch: {str(e)}. Đang chuyển sang model tiếp theo...")
            continue

    print("Lỗi nghiêm trọng: Tất cả các model trong hệ thống dự phòng đều lỗi cho Batch.")
    return []


def analyze_email(subject: str, body: str, received_at: str = None, thread_context: str = None) -> dict:
    """
    Hàm phân tích email đơn lẻ tương thích ngược với API cũ.
    Gọi analyze_emails_batch dưới dạng lô chứa 1 phần tử.
    """
    email = {
        "emailId": 0,
        "subject": subject,
        "body": body,
        "receivedAt": received_at or "",
        "threadContext": thread_context or ""
    }
    
    results = analyze_emails_batch([email])
    if results:
        res = results[0]
        
        # Định dạng danh sách ActionItem thành chuỗi phân tách bằng || phù hợp với Database Java
        formatted_actions = []
        for item in res.get("action_items", []):
            task = item.get("task", "")
            due_date = item.get("due_date", "Không rõ")
            priority = item.get("priority", "LOW")
            
            formatted = f"[{priority.upper()}] [Hạn: {due_date}] {task}"
            formatted_actions.append(formatted)
            
        return {
            "label": res.get("label", "NORMAL"),
            "summary": res.get("summary", ""),
            "suggested_replies": res.get("suggested_replies", []),
            "action_items": formatted_actions
        }
        
    return {
        "label": "NORMAL",
        "summary": "Không thể phân tích nội dung email này do lỗi kết nối AI.",
        "action_items": [],
        "suggested_replies": []
    }
