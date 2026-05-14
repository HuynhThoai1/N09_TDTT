from io import BytesIO
from PIL import Image
from sentence_transformers import SentenceTransformer

_MODEL = None
_MODEL_NAME = 'keepitreal/vietnamese-sbert'
_IMAGE_MODEL = None
_IMAGE_MODEL_NAME = 'clip-ViT-B-32'


def _get_model():
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(_MODEL_NAME)
    return _MODEL


def _get_image_model():
    global _IMAGE_MODEL
    if _IMAGE_MODEL is None:
        _IMAGE_MODEL = SentenceTransformer(_IMAGE_MODEL_NAME)
    return _IMAGE_MODEL


def generate_vector(text: str) -> list:
    """Nhận vào 1 đoạn text và trả về mảng vector (list of floats)."""
    cleaned = (text or '').strip()
    if not cleaned:
        raise ValueError('Text input is empty.')
    if len(cleaned) > 2000:
        cleaned = cleaned[:2000]

    try:
        vector = _get_model().encode(cleaned)
    except Exception as exc:
        raise RuntimeError(f'Embedding model is not available: {exc}') from exc

    return vector.tolist()


def generate_image_vector(image_bytes: bytes) -> list:
    """Nhận bytes ảnh và trả về mảng vector embedding (list of floats)."""
    if not image_bytes:
        raise ValueError('Image input is empty.')

    try:
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
    except Exception as exc:
        raise ValueError(f'Invalid image file: {exc}') from exc

    try:
        vector = _get_image_model().encode(image)
    except Exception as exc:
        raise RuntimeError(f'Image embedding model is not available: {exc}') from exc

    return vector.tolist()


# =============================================
# GEMINI INTEGRATION — Chỉ dùng để CHẤM ĐIỂM
# =============================================
import os
import json
import time as _time
from google import genai
from google.genai import types
from sentence_transformers.util import cos_sim

GEMINI_MODEL = 'gemini-2.5-flash'


def _get_gemini_client():
    """Trả về Gemini client. Trả None nếu chưa có API key."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[WARNING] GEMINI_API_KEY is not set. AI scoring will be skipped.")
        return None
    
    # Debug info (Safe)
    print(f"[DEBUG] Gemini API Key found. Length: {len(api_key)}")
    if len(api_key) > 8:
        print(f"[DEBUG] Key starts with: {api_key[:4]}... and ends with: ...{api_key[-4:]}")
    
    return genai.Client(api_key=api_key)


def _call_gemini_with_retry(client, prompt, max_retries=2):
    """Gọi Gemini - Đã tắt cơ chế retry, báo lỗi ngay nếu gặp sự cố (như 429)."""
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini Error] Xảy ra lỗi khi gọi API: {e}")
        raise e


# --- VÒNG 1: Chấm điểm bằng Python (S_prompt + S_pref + S_other) ---

def calculate_route_score_v1(route_pois, prompt_text, user_vibes, total_seconds=0):
    """
    Tính điểm Vòng 1 cho một route:
    - S_prompt (40%): Cosine Similarity với prompt (sentence-transformers).
    - S_pref   (30%): Khớp Vibe Tag của user.
    - S_other  (30%): Rate trung bình + thời gian di chuyển.
    """
    if not route_pois:
        return 0.0

    # --- S_prompt ---
    s_prompt = 0.0
    if prompt_text:
        try:
            prompt_vector = _get_model().encode([prompt_text])
            poi_descriptions = [f"{p.get('name', '')} {p.get('description', '')}" for p in route_pois]
            poi_vectors = _get_model().encode(poi_descriptions)
            similarities = cos_sim(prompt_vector, poi_vectors)[0]
            s_prompt = float(max(similarities)) if len(similarities) > 0 else 0.0
        except Exception as e:
            print(f"[Score V1] Error in S_prompt: {e}")

    # --- S_pref ---
    s_pref = 0.0
    if user_vibes:
        user_labels = [v.get('label', '').lower() for v in user_vibes if isinstance(v, dict)]
        if not user_labels and isinstance(user_vibes[0], str):
            user_labels = [v.lower() for v in user_vibes]

        match_count = 0
        total_pois = len(route_pois)
        for p in route_pois:
            cat = str(p.get('category', '')).lower()
            desc = str(p.get('description', '')).lower()
            if any(l in cat or l in desc for l in user_labels):
                match_count += 1
        s_pref = match_count / total_pois if total_pois > 0 else 0.0

    # --- S_other ---
    total_rate = sum(float(p.get('rate') or 3.0) for p in route_pois)
    rate_score = (total_rate / len(route_pois)) / 5.0
    time_score = max(0.1, 1.0 - (total_seconds / 18000))
    s_other = 0.6 * rate_score + 0.4 * time_score

    score = 0.4 * max(0, s_prompt) + 0.3 * s_pref + 0.3 * s_other
    return min(1.0, max(0.0, score))


# --- VÒNG 2: Chấm điểm bằng Gemini (chỉ scoring, KHÔNG storytelling) ---

def evaluate_routes_with_gemini(top_routes, prompt_text=""):
    """
    Gọi Gemini 1 lần duy nhất để chấm điểm logic cho Top 3 routes.
    Prompt ngắn gọn → ít token → tiết kiệm quota.
    Nếu API lỗi → fallback dùng score_v1, không crash.
    """
    client = _get_gemini_client()
    if not client or not top_routes:
        for route in top_routes:
            route["final_score"] = route.get("score_v1", 0.5)
        return top_routes

    prompt = f"""Bạn là chuyên gia du lịch TP.HCM. Chấm điểm các lộ trình dưới đây.

Yêu cầu của khách: "{prompt_text}"

Tiêu chí (mỗi tiêu chí 1-10):
1. Phù hợp ý định: Lộ trình có đáp ứng đúng "{prompt_text}" không?
2. Đa dạng trải nghiệm: Có mix ăn uống, tham quan, giải trí không?
3. Logic di chuyển: Các điểm gần nhau, thứ tự hợp lý không?

"""
    for i, route in enumerate(top_routes):
        names = " -> ".join([p.get('name', '?') for p in route.get('waypoints', [])])
        prompt += f"route_{i}: {names}\n"
        
    prompt += """
Trả về JSON thuần (KHÔNG markdown), format:
{
  "route_0": {"score": 8, "reason": "Lý do ngắn gọn (1-2 câu) tại sao lộ trình này phù hợp"},
  "route_1": {"score": 7, "reason": "..."}
}
"""

    try:
        text = _call_gemini_with_retry(client, prompt)
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]

        scores = json.loads(text.strip())
        for i, route in enumerate(top_routes):
            gemini_data = scores.get(f"route_{i}", {})
            if isinstance(gemini_data, dict):
                s_ai = float(gemini_data.get("score", 5)) / 10.0
                route["ai_reason"] = gemini_data.get("reason", route.get("ai_reason", ""))
            else:
                s_ai = float(gemini_data) / 10.0
                
            s_v1 = route.get("score_v1", 0.5)
            route["final_score"] = 0.7 * s_v1 + 0.3 * s_ai
            route["ai_score_raw"] = s_ai * 10

        print(f"[Gemini] Scoring & Reasoning OK (1 API call, {len(top_routes)} routes)")

    except Exception as e:
        print(f"[Gemini Scoring Error]: {e}")
        for route in top_routes:
            route["final_score"] = route.get("score_v1", 0.5)

    top_routes.sort(key=lambda x: x.get("final_score", 0), reverse=True)
    return top_routes


# --- BACKWARD COMPATIBILITY ---

def evaluate_and_narrate_routes(top_routes, prompt_text):
    """Wrapper: gọi evaluate_routes_with_gemini."""
    return evaluate_routes_with_gemini(top_routes, prompt_text)


def generate_storytelling(route_pois, prompt_text):
    """Deprecated — storytelling giờ sinh local bằng _generate_ai_reason()."""
    return ""

# --- CƠ CHẾ HỎI NGƯỢC (CLARIFICATION) ---

def analyze_prompt_clarification(prompt_text):
    """
    Sử dụng Gemini để phân tích xem prompt của người dùng đã đủ thông tin chưa.
    Nếu chưa đủ, sinh ra các câu hỏi phỏng vấn.
    """
    client = _get_gemini_client()
    if not client:
        return {"is_sufficient": True, "questions": []}

    system_instruction = """
    Bạn là một chuyên gia lập kế hoạch du lịch thông minh.
    Nhiệm vụ của bạn là đánh giá xem yêu cầu (prompt) của người dùng đã đủ thông tin để tạo một lộ trình HOÀN HẢO chưa.
    
    Thông tin hoàn hảo bao gồm:
    1. Đối tượng đi cùng (Ai?)
    2. Phong cách trải nghiệm (Vận động mạnh, nhẹ nhàng, lãng mạn...?)
    3. Ngân sách hoặc sở thích đặc biệt.

    Nếu prompt quá ngắn (ví dụ: "đi chơi", "tìm chỗ ăn") -> Trả về is_sufficient: false và 2-3 câu hỏi.
    Nếu prompt đã chi tiết -> Trả về is_sufficient: true.

    YÊU CẦU ĐỊNH DẠNG TRẢ VỀ LÀ JSON NGUYÊN BẢN (KHÔNG CÓ ```json):
    {
      "is_sufficient": boolean,
      "questions": [
        {
          "question": "Câu hỏi làm rõ...",
          "options": [
            {"id": "A", "text": "Lựa chọn 1"},
            {"id": "B", "text": "Lựa chọn 2"},
            {"id": "Other", "text": "Khác"}
          ]
        }
      ]
    }
    """

    prompt = f"Phân tích prompt sau: '{prompt_text}'"
    
    try:
        response_text = _call_gemini_with_retry(client, f"{system_instruction}\n\n{prompt}")
        # Làm sạch response nếu AI trả về markdown
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_json)
        return result
    except Exception as e:
        print(f"[Clarification Error] Lỗi phân tích prompt: {e}")
        return {"is_sufficient": True, "questions": []} # Fallback: Cho phép đi tiếp
