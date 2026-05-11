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

GEMINI_MODEL = 'gemini-1.5-flash'


def _get_gemini_client():
    """Trả về Gemini client. Trả None nếu chưa có API key."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[WARNING] GEMINI_API_KEY is not set. AI scoring will be skipped.")
        return None
    return genai.Client(api_key=api_key)


def _call_gemini_with_retry(client, prompt, max_retries=2):
    """Gọi Gemini với retry khi bị 429 rate limit."""
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            error_str = str(e)
            is_rate_limited = '429' in error_str
            is_daily_limit = 'PerDay' in error_str

            if is_rate_limited and is_daily_limit:
                # Quota hàng ngày đã hết → retry không có ích
                print(f"[Gemini] Daily quota exhausted. Skipping (no retry).")
                raise e
            elif is_rate_limited and attempt < max_retries:
                # Chỉ retry nếu là giới hạn per-minute
                wait = 7 * (attempt + 1)
                print(f"[Gemini] Per-minute rate limit. Retry in {wait}s... ({attempt + 1}/{max_retries})")
                _time.sleep(wait)
            else:
                raise e
    return None


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

    # Prompt cực ngắn
    prompt = f'Chấm điểm 1-10 về logic địa lý. User: "{prompt_text}". JSON.\n'
    for i, route in enumerate(top_routes):
        names = ", ".join([p.get('name', '?') for p in route.get('waypoints', [])])
        prompt += f"route_{i}: {names}\n"
    prompt += 'Trả về: {"route_0": 8, "route_1": 7}'

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
            s_ai = float(scores.get(f"route_{i}", 5)) / 10.0
            s_v1 = route.get("score_v1", 0.5)
            route["final_score"] = 0.7 * s_v1 + 0.3 * s_ai
            route["ai_score_raw"] = s_ai * 10

        print(f"[Gemini] Scoring OK (1 API call, {len(top_routes)} routes)")

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
