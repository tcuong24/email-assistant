import google.generativeai as genai
import os
import json
import re
import time
from google.api_core.exceptions import ResourceExhausted, NotFound

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODELS_POOL = [
    "gemini-3.1-flash-lite",  # Hàng ưu tiên 1: Tiết kiệm nhất thế hệ mới
    "gemini-2.5-flash-lite",  # Hàng ưu tiên 2: Tiết kiệm nhất thế hệ cũ
    "gemini-2.5-flash",       # Hàng ưu tiên 3: Ổn định, quota rất rộng
    "gemini-3.5-flash"        # Hàng ưu tiên 4: Frontier Flash
]

def analyze_email(subject: str, body: str) -> dict:
    """
    Phân tích email: phân loại, tóm tắt và gợi ý phản hồi trong 1 cuộc gọi API duy nhất.
    """
    # 1. Làm sạch HTML và chuẩn hóa khoảng trắng để tiết kiệm token đầu vào
    clean_body = body or ""
    clean_body = re.sub(r'<[^>]*>', '', clean_body)
    clean_body = re.sub(r'\s+', ' ', clean_body).strip()

    # Cắt ngắn nội dung email nếu quá dài (chỉ lấy tối đa 3000 ký tự đầu)
    if len(clean_body) > 3000:
        clean_body = clean_body[:3000] + "..."

    prompt = f"""Phân tích email dưới đây để thực hiện các tác vụ:
1. Phân loại theo mức độ ưu tiên cá nhân (label): Đánh giá email này thuộc nhãn nào trong:
   - SPAM: Email rác, quảng cáo bẩn, lừa đảo.
   - URGENT: Email cực kỳ khẩn cấp cần xử lý hoặc trả lời ngay (ví dụ: yêu cầu gấp từ sếp/đối tác quan trọng, khiếu nại nghiêm trọng của khách hàng, sự cố hệ thống).
   - IMPORTANT: Email quan trọng (ví dụ: công việc thường nhật, thảo luận dự án, thông báo quan trọng).
   - NORMAL: Email thông thường khác.
2. Tóm tắt nội dung (summary): Tóm tắt email tối đa 2 câu ngắn gọn bằng tiếng Việt. Nếu là SPAM thì ghi 'Email spam.'
3. Trích xuất đầu việc cần làm (action_items): Phân tích xem trong thư đối tác có yêu cầu bạn thực hiện hành động hoặc công việc cụ thể nào không (ví dụ: "Gửi báo cáo trước thứ 6", "Lên lịch họp vào ngày mai"). Trích xuất danh sách các việc cần làm dưới dạng mảng các chuỗi ngắn gọn bằng tiếng Việt. Nếu không có yêu cầu nào hoặc thư là SPAM, trả về mảng rỗng [].
4. Gợi ý phản hồi (suggested_replies): Gợi ý 3 câu trả lời ngắn gọn bằng tiếng Việt. Nếu là SPAM, trả về mảng rỗng [].

Trả về kết quả dưới dạng một đối tượng JSON duy nhất có cấu trúc chính xác như sau:
{{
  "label": "Tên nhãn (chọn 1 từ duy nhất viết hoa: SPAM, URGENT, IMPORTANT, NORMAL)",
  "summary": "Nội dung tóm tắt",
  "action_items": ["Việc cần làm 1", "Việc cần làm 2"],
  "suggested_replies": ["Gợi ý phản hồi 1", "Gợi ý phản hồi 2", "Gợi ý phản hồi 3"]
}}

Subject: {subject}
Body: {clean_body}

Hãy chắc chắn trả về ĐÚNG định dạng JSON trên, không thêm bất kỳ văn bản giải thích nào khác ngoài chuỗi JSON."""

    for model_name in MODELS_POOL:
        try:
            print(f"Đang phân tích email bằng model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            result = json.loads(response.text.strip())
            
            # Kiểm tra tính hợp lệ của cấu trúc JSON trả về
            if "label" in result and "summary" in result and "action_items" in result and "suggested_replies" in result:
                # Chuẩn hóa nhãn ưu tiên
                lbl = str(result["label"]).upper().strip()
                if lbl not in ["SPAM", "URGENT", "IMPORTANT", "NORMAL"]:
                    lbl = "NORMAL"
                result["label"] = lbl
                
                # Chuẩn hóa mảng việc cần làm
                if not isinstance(result["action_items"], list):
                    result["action_items"] = []
                
                # Chuẩn hóa mảng gợi ý phản hồi
                if not isinstance(result["suggested_replies"], list):
                    result["suggested_replies"] = []
                
                return result
        except ResourceExhausted:
            print(f"Cảnh báo: Model {model_name} đã hết quota. Đợi 5 giây trước khi thử model tiếp theo...")
            time.sleep(5)
            continue
        except NotFound:
            print(f"Cảnh báo: Model {model_name} không tồn tại hoặc đã bị gỡ bỏ. Đang chuyển model...")
            continue
        except Exception as e:
            print(f"Lỗi khi gọi model {model_name}: {str(e)}. Đang chuyển sang model tiếp theo...")
            continue

    # Fallback dự phòng cuối cùng nếu tất cả model bị lỗi hoặc hết quota
    print("Lỗi nghiêm trọng: Tất cả các model trong hệ thống dự phòng đều lỗi.")
    return {
        "label": "NORMAL",
        "summary": "Không thể phân tích nội dung email này do lỗi kết nối AI.",
        "action_items": [],
        "suggested_replies": []
    }
