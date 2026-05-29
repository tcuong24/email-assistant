import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.1-flash-lite")

def summarize(subject: str, body: str) -> str:
    prompt = f"""Tóm tắt email sau trong tối đa 2 câu ngắn gọn bằng tiếng Việt.
Chỉ trả về phần tóm tắt, không thêm gì khác.

Subject: {subject}
Body: {body}

Tóm tắt:"""

    response = model.generate_content(prompt)
    return response.text.strip()