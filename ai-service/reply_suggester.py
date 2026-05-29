import google.generativeai as genai
import os
import json

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.1-flash-lite")

def suggest_replies(subject: str, body: str) -> list[str]:
    prompt = f"""Gợi ý 3 câu trả lời ngắn cho email sau.
Trả về JSON array, mỗi phần tử là 1 câu trả lời, không giải thích thêm.

Subject: {subject}
Body: {body}

Ví dụ output:
["Cảm ơn bạn, tôi sẽ xem xét.", "Tôi đã nhận được, sẽ phản hồi sớm.", "Vâng, tôi đồng ý."]

Output:"""

    response = model.generate_content(prompt)
    text = response.text.strip()

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