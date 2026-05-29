import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.1-flash-lite")

def classify(subject: str, body: str) -> str:
    prompt = f"""Phân loại email sau vào 1 trong 3 nhãn: SPAM, IMPORTANT, NORMAL.
Chỉ trả về đúng 1 từ, không giải thích.

Ví dụ:
Subject: Bạn đã trúng thưởng 1 tỷ đồng
Body: Click vào link để nhận thưởng ngay
→ SPAM

Subject: Họp nhóm 9h sáng mai
Body: Nhớ chuẩn bị báo cáo tuần
→ IMPORTANT

Subject: Newsletter tháng 5
Body: Các tin tức công nghệ mới nhất
→ NORMAL

---
Subject: {subject}
Body: {body}
→"""

    response = model.generate_content(prompt)
    label = response.text.strip().upper()

    if label not in ["SPAM", "IMPORTANT", "NORMAL"]:
        label = "NORMAL"
    return label