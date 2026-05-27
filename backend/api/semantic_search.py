"""
Module Semantic Search sử dụng CLIP.
Sử dụng dữ liệu từ Database và có cơ chế CACHE để tối ưu RAM/Performance.
"""

import math
import time
import re
import sys
import io
import builtins
from collections import Counter
from .models import PointOfInterest

builtins_print = builtins.print

def _safe_print(*args, **kwargs):
    f = io.StringIO()
    kwargs.pop('file', None)
    builtins_print(*args, file=f, **kwargs)
    msg = f.getvalue()
    try:
        sys.stdout.write(msg)
        sys.stdout.flush()
    except UnicodeEncodeError:
        try:
            encoding = sys.stdout.encoding or 'utf-8'
            sys.stdout.write(msg.encode(encoding, errors='backslashreplace').decode(encoding))
            sys.stdout.flush()
        except Exception:
            pass

# Override standard print in this module to avoid Windows UnicodeEncodeError
print = _safe_print

# --- Global Cache ---
_clip_model = None
_sbert_model = None
_poi_vectors_cache = None
_last_cache_update = 0
CACHE_TTL = 300

def _clean_prompt(prompt_text: str) -> str:
    """
    Tiền xử lý prompt:
    1. Cắt ngắn tối đa 1000 ký tự để không gây tràn bộ nhớ encode của model.
    2. Loại bỏ các thẻ HTML để tránh nhiễu thông tin.
    3. Chuẩn hóa khoảng trắng dư thừa.
    4. Xử lý trùng lặp từ khóa quá nhiều (keyword stuffing) bằng cách:
       - Loại bỏ từ/cụm từ lặp lại liên tiếp ở cấp độ từ đơn và cụm từ (lên đến 4 từ).
       - Giới hạn tần suất xuất hiện tối đa của một từ là 3 lần.
    """
    if not prompt_text:
        return ""
    
    # 1. Cắt ngắn tối đa 1000 ký tự
    if len(prompt_text) > 1000:
        prompt_text = prompt_text[:1000]
        print(f"[SemanticSearch] Prompt quá dài. Đã cắt về 1000 ký tự.")
        
    # 2. Strip HTML tags
    prompt_text = re.sub(r'<[^>]+>', ' ', prompt_text)
    
    # 3. Chuẩn hóa khoảng trắng
    prompt_text = ' '.join(prompt_text.split())
    
    # 4. Loại bỏ trùng lặp từ/cụm từ liên tiếp (Keyword Stuffing)
    words = prompt_text.split()
    
    changed = True
    while changed:
        changed = False
        n = len(words)
        i = 0
        result = []
        while i < n:
            matched = False
            for k in range(min(4, n - i), 0, -1):
                pattern = words[i:i+k]
                if i + 2*k <= n and [w.lower() for w in words[i+k:i+2*k]] == [w.lower() for w in pattern]:
                    result.extend(pattern)
                    i += 2 * k
                    matched = True
                    changed = True
                    break
            if not matched:
                result.append(words[i])
                i += 1
        words = result
            
    word_counts = Counter()
    final_words = []
    for word in words:
        word_lower = word.lower()
        if word_counts[word_lower] < 3:
            final_words.append(word)
            word_counts[word_lower] += 1
            
    return ' '.join(final_words)

def _is_vietnamese(text: str) -> bool:
    """
    Xác định xem prompt có phải tiếng Việt hay không.
    Kiểm tra dựa trên các ký tự có dấu tiếng Việt đặc trưng hoặc các từ tiếng Việt không dấu phổ biến.
    """
    vietnamese_diacritics = set("áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ")
    text_lower = text.lower()
    
    # Kiểm tra các ký tự có dấu đặc trưng
    if any(char in vietnamese_diacritics for char in text_lower):
        return True
        
    # Kiểm tra các từ tiếng Việt không dấu phổ biến
    common_vi_words = {
        "di", "lich", "quan", "an", "uong", "ca", "phe", "o", "tai", "quan", 
        "trong", "cho", "va", "cua", "la", "co", "khong", "dep", "gon", "nhe",
        "sinh", "nhat", "ban", "gai", "bo", "me", "gia", "dinh", "hen", "ho",
        "choi", "giup", "tim", "kiem", "diem", "dung"
    }
    words = text_lower.split()
    if any(w in common_vi_words for w in words):
        return True
        
    return False

def _get_clip_model():
    global _clip_model
    if _clip_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _clip_model = SentenceTransformer("clip-ViT-B-32")
            print("[SemanticSearch] CLIP model loaded OK.")
        except Exception as e:
            print(f"[SemanticSearch] CLIP Model load failed: {e}")
            _clip_model = False
    return _clip_model if _clip_model is not False else None

def _get_sbert_model():
    global _sbert_model
    if _sbert_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _sbert_model = SentenceTransformer("keepitreal/vietnamese-sbert")
            print("[SemanticSearch] SBERT model loaded OK.")
        except Exception as e:
            print(f"[SemanticSearch] SBERT Model load failed: {e}")
            _sbert_model = False
    return _sbert_model if _sbert_model is not False else None

def _get_poi_vectors_cached():
    global _poi_vectors_cache, _last_cache_update
    current_time = time.time()
    
    if _poi_vectors_cache is None or (current_time - _last_cache_update > CACHE_TTL):
        pois = PointOfInterest.objects.filter(vector__isnull=False)
        results = []
        seen_ids = set()
        seen_coords = set()
        
        for p in pois:
            if p.vector and len(p.vector) > 0:
                poi_id = p.poi_id or str(p.id)
                # Lọc trùng lặp địa điểm theo ID
                if poi_id in seen_ids:
                    print(f"[SemanticSearch] Phát hiện trùng lặp ID '{poi_id}' ('{p.name}'). Đã bỏ qua.")
                    continue
                
                # Lọc trùng lặp địa điểm theo tọa độ (làm tròn đến 4 chữ số thập phân - bán kính ~11m)
                if p.latitude is not None and p.longitude is not None:
                    coord_key = (round(p.latitude, 4), round(p.longitude, 4))
                    if coord_key in seen_coords:
                        print(f"[SemanticSearch] Phát hiện trùng lặp tọa độ {coord_key} ('{p.name}'). Đã bỏ qua.")
                        continue
                    seen_coords.add(coord_key)
                
                seen_ids.add(poi_id)
                results.append({
                    "poi_id": poi_id,
                    "name": p.name,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "image": p.image,
                    "image_list": p.image_list,
                    "category": p.category,
                    "description": p.description,
                    "rating": p.rating,  # Điểm đánh giá từ cộng đồng (Google Maps)
                    "vector": p.vector, # CLIP
                    "text_vector": p.text_vector, # SBERT
                })
        _poi_vectors_cache = results
        _last_cache_update = current_time
        print(f"[SemanticSearch] Cache UPDATED: {len(_poi_vectors_cache)} unique POIs loaded from DB.")
    
    return _poi_vectors_cache

def _cosine_similarity(vec_a: list, vec_b: list) -> float:
    if not vec_a or not vec_b: return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0: return 0.0
    return dot / (norm_a * norm_b)

def find_related_pois(prompt_text: str, mandatory_stops: list, top_k: int = 10, min_score: float = 0.15) -> list:
    # Tiền xử lý prompt (Loại bỏ HTML, chuẩn hóa khoảng trắng, cắt ngắn, chặn keyword stuffing)
    prompt_text = _clean_prompt(prompt_text)
        
    # Edge Case 1.1: Prompt trống hoặc không chứa ký tự chữ/số nào hợp lệ
    if not prompt_text or not any(c.isalnum() for c in prompt_text):
        print(f"[SemanticSearch] Prompt trống hoặc vô nghĩa. Bỏ qua tìm kiếm.")
        return []

    print(f"[SemanticSearch] Đang tìm kiếm cho: '{prompt_text}'...")
    clip_model = _get_clip_model()
    sbert_model = _get_sbert_model()
    poi_vectors = _get_poi_vectors_cached()

    if not clip_model or not sbert_model or not poi_vectors:
        print("[SemanticSearch] Models or Cache not ready!")
        return []

    try:
        t_encode_start = time.time()
        clip_prompt_vector = clip_model.encode(prompt_text, normalize_embeddings=True).tolist()
        sbert_prompt_vector = sbert_model.encode(prompt_text, normalize_embeddings=True).tolist()
        t_encode = time.time() - t_encode_start
    except Exception as e:
        print(f"[SemanticSearch] Encode prompt failed: {e}")
        return []
    
    # Xác định ngôn ngữ để điều chỉnh trọng số (Edge Case 2: Đa ngôn ngữ)
    is_vi = _is_vietnamese(prompt_text)
    if is_vi:
        w_text, w_visual = 0.6, 0.4
        print(f"[SemanticSearch] Phát hiện tiếng Việt. Trọng số Text: {w_text}, Visual: {w_visual}")
    else:
        w_text, w_visual = 0.2, 0.8
        print(f"[SemanticSearch] Phát hiện ngôn ngữ khác (English/Korean...). Trọng số Text: {w_text}, Visual: {w_visual} (Ưu tiên CLIP)")

    t_search_start = time.time()
    mandatory_ids = {str(s.get("id") or s.get("poi_id")) for s in mandatory_stops}

    scored = []
    for poi in poi_vectors:
        if poi["poi_id"] in mandatory_ids:
            continue
        
        # Edge Case 3: Kiểm tra tính hợp lệ và chiều của vector hình ảnh (CLIP) trước khi tính cosine
        visual_score = 0.0
        if poi.get("vector") and isinstance(poi["vector"], list) and len(poi["vector"]) == len(clip_prompt_vector):
            visual_score = _cosine_similarity(clip_prompt_vector, poi["vector"])
        
        # Edge Case 3.1: Kiểm tra tính hợp lệ và chiều của vector mô tả (SBERT) trước khi tính cosine
        text_score = 0.0
        if poi.get("text_vector") and isinstance(poi["text_vector"], list) and len(poi["text_vector"]) == len(sbert_prompt_vector):
            text_score = _cosine_similarity(sbert_prompt_vector, poi["text_vector"])
        else:
            text_score = visual_score # Fallback khi thiếu hoặc lỗi text_vector
            
        # Kết hợp (Dual-Vector) với trọng số động
        combined_score = w_text * text_score + w_visual * visual_score
        
        if combined_score < min_score:
            continue

        scored.append({
            "poi_id": poi["poi_id"],
            "name": poi["name"],
            "latitude": poi["latitude"],
            "longitude": poi["longitude"],
            "image": poi["image"],
            "image_list": poi["image_list"],
            "category": poi["category"],
            "description": poi.get("description", ""),
            "rating": poi.get("rating", 0),
            "similarity_score": round(combined_score, 4),
            "text_score": round(text_score, 4),
            "visual_score": round(visual_score, 4)
        })

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    t_search = time.time() - t_search_start
    
    print(f"\n[SemanticSearch] --- Kết quả tìm kiếm ngữ nghĩa (Dual-Vector) ---")
    print(f"[SemanticSearch] 1. Encoding (CLIP+SBERT): {round(t_encode, 3)}s")
    print(f"[SemanticSearch] 2. Search & Combine: {round(t_search, 3)}s")
    print(f"[SemanticSearch] 3. Tìm thấy {len(scored)} ứng viên (Ngưỡng: {min_score}).")
    if scored:
        print(f"[SemanticSearch] 4. Điểm cao nhất: {scored[0]['name']} (Combined: {scored[0]['similarity_score']} | T:{scored[0]['text_score']} | V:{scored[0]['visual_score']})")
    
    return scored[:top_k]
