import google.generativeai as genai
import os

from google.api_core.exceptions import ResourceExhausted, NotFound

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODELS_POOL = [
    "gemini-3.1-flash-lite",  # Hàng ưu tiên 1: Tiết kiệm nhất thế hệ mới
    "gemini-2.5-flash-lite",  # Hàng ưu tiên 2: Tiết kiệm nhất thế hệ cũ
    "gemini-2.5-flash",       # Hàng ưu tiên 3: Ổn định, quota rất rộng
    "gemini-3.5-flash"        # Hàng ưu tiên 4: Frontier Flash
]

def summarize(subject: str, body: str) -> str:
    prompt = f"""Tóm tắt email sau trong tối đa 2 câu ngắn gọn bằng tiếng Việt.
Chỉ trả về phần tóm tắt, không thêm gì khác.

Subject: {subject}
Body: {body}

Tóm tắt:"""

    for model_name in MODELS_POOL:
        try:
            print(f"Đang thử tóm tắt bằng model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text.strip()
        except ResourceExhausted:
            print(f"Cảnh báo: Model {model_name} đã hết quota (429). Đang chuyển model...")
            continue
        except NotFound:
            print(f"Cảnh báo: Model {model_name} không tồn tại hoặc đã bị gỡ bỏ (404). Đang chuyển model...")
            continue
        except Exception as e:
            print(f"Lỗi khi gọi model {model_name}: {str(e)}. Đang chuyển model...")
            continue

    # Fallback dự phòng cuối cùng
    return "Không thể tóm tắt nội dung email này do lỗi kết nối AI."