"""
Module Semantic Search sử dụng CLIP.
Sử dụng dữ liệu từ Database và có cơ chế CACHE để tối ưu RAM/Performance.
"""

import math
import time
from .models import PointOfInterest

# --- Global Cache ---
_model = None
_poi_vectors_cache = None
_last_cache_update = 0
CACHE_TTL = 300 # Reset cache mỗi 5 phút (nếu muốn) hoặc để vô hạn

def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("clip-ViT-B-32")
            print("[SemanticSearch] CLIP model loaded OK.")
        except Exception as e:
            print(f"[SemanticSearch] Model load failed: {e}")
            _model = False
    return _model if _model is not False else None

def _get_poi_vectors_cached():
    """Lấy dữ liệu từ Cache, nếu chưa có hoặc hết hạn mới gọi DB."""
    global _poi_vectors_cache, _last_cache_update
    
    current_time = time.time()
    # Nếu cache chưa có HOẶC bạn muốn tự động cập nhật sau một khoảng thời gian
    if _poi_vectors_cache is None or (current_time - _last_cache_update > CACHE_TTL):
        pois = PointOfInterest.objects.filter(vector__isnull=False)
        results = []
        for p in pois:
            if p.vector and len(p.vector) > 0:
                results.append({
                    "poi_id": p.poi_id or str(p.id),
                    "name": p.name,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "image": p.image,
                    "image_list": p.image_list,
                    "category": p.category,
                    "description": p.description,
                    "vector": p.vector,
                })
        _poi_vectors_cache = results
        _last_cache_update = current_time
        print(f"[SemanticSearch] Cache UPDATED: {len(_poi_vectors_cache)} POIs loaded from DB.")
    
    return _poi_vectors_cache

def _cosine_similarity(vec_a: list, vec_b: list) -> float:
    if not vec_a or not vec_b: return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0: return 0.0
    return dot / (norm_a * norm_b)

def find_related_pois(prompt_text: str, mandatory_stops: list, top_k: int = 10, min_score: float = 0.22) -> list:
    t_start = time.time()
    model = _get_model()
    # Dùng Cache thay vì gọi DB trực tiếp mỗi lần
    poi_vectors = _get_poi_vectors_cached()

    if not model or not poi_vectors:
        return []

    try:
        prompt_vector = model.encode(prompt_text, normalize_embeddings=True).tolist()
    except Exception as e:
        print(f"[SemanticSearch] Encode prompt failed: {e}")
        return []
    
    t_encode = time.time()

    mandatory_ids = {str(s.get("id") or s.get("poi_id")) for s in mandatory_stops}

    scored = []
    for poi in poi_vectors:
        if poi["poi_id"] in mandatory_ids:
            continue
        
        score = _cosine_similarity(prompt_vector, poi["vector"])
        
        # CHẶN NẾU GÓC QUÁ NHỎ (Score thấp)
        if score < min_score:
            continue

        scored.append({
            "poi_id": poi["poi_id"],
            "name": poi["name"],
            "latitude": poi["latitude"],
            "longitude": poi["longitude"],
            "image": poi["image"],
            "image_list": poi["image_list"],
            "category": poi["category"],
            "similarity_score": round(score, 4),
        })

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    t_finish = time.time()
    print(f"\n[SemanticSearch] --- Kết quả tìm kiếm ngữ nghĩa ---")
    print(f"[SemanticSearch] 1. CLIP Encoding: {round(t_encode - t_start, 3)}s")
    print(f"[SemanticSearch] 2. Search & Score: {round(t_finish - t_encode, 3)}s")
    
    return scored[:top_k]
