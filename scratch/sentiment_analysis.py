import requests
import time

# Bước 1: Thiết lập cơ bản (Setup)
API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-xlm-roberta-base-sentiment"

def analyze_sentiment(text):
    # Bước 2: Đóng gói dữ liệu đầu vào (Payload)
    payload = {"inputs": text}
    
    # Sử dụng vòng lặp while để có thể Retry khi gặp lỗi 503
    while True:
        # Bước 3: Giao tiếp với API (Core Processing)
        response = requests.post(API_URL, json=payload)
        result = response.json()
        
        # Bước 5: Kỹ thuật "Lách luật" & Bắt lỗi - Xử lý lỗi 503 (Model is Loading)
        if isinstance(result, dict) and "error" in result:
            if "loading" in result["error"].lower() or response.status_code == 503:
                print("Model đang khởi động, chờ 20 giây trước khi thử lại...")
                time.sleep(20)
                continue # Tự động gọi lại (Retry)
            else:
                print(f"Lỗi API: {result['error']}")
                return None
                
        # Bước 4: Hậu xử lý kết quả (Post-processing)
        # Thông thường API trả về dạng danh sách lồng nhau: [[{'label': 'LABEL_0', 'score': 0.9}, ...]]
        # Hoặc một danh sách chứa dictionary: [{'label': 'LABEL_0', 'score': 0.9}, ...]
        predictions = result[0] if isinstance(result[0], list) else result
        
        # Kiểm tra đúng định dạng (danh sách chứa các dictionary)
        if isinstance(predictions, list) and len(predictions) > 0 and isinstance(predictions[0], dict):
            # Tìm phần tử có score (điểm số) cao nhất
            best_prediction = max(predictions, key=lambda x: x['score'])
            
            # Chuyển đổi nhãn (Map Labels)
            label_mapping = {
                "LABEL_0": "Negative",
                "LABEL_1": "Neutral",
                "LABEL_2": "Positive"
            }
            
            final_label = label_mapping.get(best_prediction['label'], "Unknown")
            
            return {
                "label": final_label,
                "score": best_prediction['score']
            }
        else:
            print("Định dạng JSON không như mong đợi:", result)
            return None

# Chạy thử nghiệm với danh sách nhiều bài báo
if __name__ == "__main__":
    danh_sach_bai_bao = [
        "Dịch vụ ở đây cực kỳ tốt, nhân viên thân thiện và nhiệt tình.",
        "Sản phẩm quá tệ, vừa mua về đã hỏng, tôi rất thất vọng.",
        "Thời tiết hôm nay bình thường, không mưa cũng không nắng gắt."
    ]
    
    # Duyệt qua các bài báo
    for i, bai_bao in enumerate(danh_sach_bai_bao):
        print(f"Đang phân tích bài báo {i+1}...")
        ket_qua = analyze_sentiment(bai_bao)
        
        if ket_qua:
            print(f"Kết quả: {ket_qua['label']} (Score: {ket_qua['score']:.4f})")
        print("-" * 40)
        
        # Bước 5: Xử lý lỗi 429 (Too Many Requests) - Chờ 2 giây sau mỗi bài báo
        time.sleep(2)
