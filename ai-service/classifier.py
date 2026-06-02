import google.generativeai as genai
import os
from google.api_core.exceptions import ResourceExhausted
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.1-flash-lite")
MODELS_POOL = [
    "gemini-3.1-flash-lite",  # Hàng ưu tiên 1: Tiết kiệm nhất thế hệ mới
    "gemini-2.5-flash-lite",  # Hàng ưu tiên 2: Tiết kiệm nhất thế hệ cũ
    "gemini-2.5-flash",       # Hàng ưu tiên 3: Ổn định, quota rất rộng
    "gemini-3.5-flash"        # Hàng ưu tiên 4: Frontier Flash
]
def classify(subject: str, body: str) -> str:
    prompt = f"""Phân loại email sau vào 1 trong các nhãn danh mục sau:
1. PRIMARY: Email cá nhân, trao đổi công việc quan trọng trực tiếp.
2. PROMOTIONS: Email quảng cáo, khuyến mãi, newsletter, ưu đãi từ nhãn hàng.
3. SOCIAL: Email thông báo từ mạng xã hội (Facebook, LinkedIn, TikTok...).
4. UPDATES: Email xác nhận tự động, hóa đơn, biên lai, mã OTP.
5. FORUMS: Email từ diễn đàn, cộng đồng, nhóm thảo luận.
6. SPAM: Email rác, lừa đảo, quảng cáo bẩn độc hại.

Chỉ trả về đúng 1 từ tiếng Anh in hoa duy nhất là tên nhãn (PRIMARY, PROMOTIONS, SOCIAL, UPDATES, FORUMS, SPAM), không giải thích gì thêm.

Subject: {subject}
Body: {body}
→"""

    for model_name in MODELS_POOL:
        try:
            print(f"Đang thử phân loại bằng model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            
            # Nếu gọi thành công, lấy nhãn trả về
            label = response.text.strip().upper()
            if label in ["PRIMARY", "PROMOTIONS", "SOCIAL", "UPDATES", "FORUMS", "SPAM"]:
                return label
            return "PRIMARY"
            
        except ResourceExhausted:
            # Bắt đúng lỗi hết Quota (429) và in thông báo chuyển model
            print(f"Cảnh báo: Model {model_name} đã hết quota (429). Đang chuyển sang model tiếp theo...")
            continue
        except Exception as e:
            # Bắt các lỗi hệ thống/kết nối khác và chuyển model tiếp theo
            print(f"Lỗi khi gọi model {model_name}: {str(e)}. Đang chuyển sang model tiếp theo...")
            continue
            
    # Trường hợp xấu nhất khi tất cả các model trong danh sách đều lỗi/hết hạn mức
    print("Lỗi nghiêm trọng: Tất cả các model trong hệ thống dự phòng đều hết quota.")
    return "PRIMARY" # Trả về nhãn mặc định để tránh làm sập luồng xử lý