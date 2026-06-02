import google.generativeai as genai
import os
import json

from google.api_core.exceptions import ResourceExhausted, NotFound

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODELS_POOL = [
    "gemini-3.1-flash-lite",  # Hàng ưu tiên 1: Tiết kiệm nhất thế hệ mới
    "gemini-2.5-flash-lite",  # Hàng ưu tiên 2: Tiết kiệm nhất thế hệ cũ
    "gemini-2.5-flash",       # Hàng ưu tiên 3: Ổn định, quota rất rộng
    "gemini-3.5-flash"        # Hàng ưu tiên 4: Frontier Flash
]

def suggest_replies(subject: str, body: str) -> list[str]:
    prompt = f"""Gợi ý 3 câu trả lời ngắn cho email sau.
Trả về JSON array, mỗi phần tử là 1 câu trả lời, không giải thích thêm.

Subject: {subject}
Body: {body}

Ví dụ output:
["Cảm ơn bạn, tôi sẽ xem xét.", "Tôi đã nhận được, sẽ phản hồi sớm.", "Vâng, tôi đồng ý."]

Output:"""

    text = ""
    for model_name in MODELS_POOL:
        try:
            print(f"Đang thử gợi ý phản hồi bằng model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = response.text.strip()
            break
        except ResourceExhausted:
            print(f"Cảnh báo: Model {model_name} đã hết quota (429). Đang chuyển model...")
            continue
        except NotFound:
            print(f"Cảnh báo: Model {model_name} không tồn tại hoặc đã bị gỡ bỏ (404). Đang chuyển model...")
            continue
        except Exception as e:
            print(f"Lỗi khi gọi model {model_name}: {str(e)}. Đang chuyển model...")
            continue

    if not text:
        return ["Cảm ơn email của bạn.", "Tôi sẽ phản hồi sớm.", "Đã nhận được thông tin."]

    try:
        # Bỏ markdown code block nếu có
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        # Fallback nếu parse lỗi
        return ["Cảm ơn email của bạn.", "Tôi sẽ phản hồi sớm.", "Đã nhận được thông tin."]