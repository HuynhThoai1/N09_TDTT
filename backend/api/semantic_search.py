"""
Module Semantic Search sử dụng CLIP.
Sử dụng dữ liệu từ Database và có cơ chế CACHE để tối ưu RAM/Performance.
"""

import math
import time
from .models import PointOfInterest

# --- Global Cache ---
_clip_model = None
_sbert_model = None
_poi_vectors_cache = None
_last_cache_update = 0
CACHE_TTL = 300

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
                    "vector": p.vector, # CLIP
                    "text_vector": p.text_vector, # SBERT
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

def find_related_pois(prompt_text: str, mandatory_stops: list, top_k: int = 10, min_score: float = 0.15) -> list:
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
    
    t_search_start = time.time()
    mandatory_ids = {str(s.get("id") or s.get("poi_id")) for s in mandatory_stops}

    scored = []
    for poi in poi_vectors:
        if poi["poi_id"] in mandatory_ids:
            continue
        
        # Tính visual score (CLIP)
        visual_score = _cosine_similarity(clip_prompt_vector, poi["vector"])
        
        # Tính text score (SBERT)
        text_score = 0.0
        if poi.get("text_vector"):
            text_score = _cosine_similarity(sbert_prompt_vector, poi["text_vector"])
        else:
            text_score = visual_score # Fallback
            
        # Kết hợp (Dual-Vector)
        combined_score = 0.6 * text_score + 0.4 * visual_score
        
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
