import sys
import json
from pathlib import Path
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import PointOfInterest
from .serializers import POISerializer
from .semantic_search import find_related_pois
from .itinerary_optimizer import build_top3_routes

# --- HELPER FUNCTIONS ---

def _fix_image_path(request, p):
    """Sửa lỗi đường dẫn ảnh (assets -> media) và đảm bảo có domain."""
    if not p: return ""
    base_url = request.build_absolute_uri('/')[:-1]
    # Chuyển assets sang media và xóa domain dư thừa nếu có
    clean_p = str(p).replace("assets/images", "media").replace("http://localhost:8000/", "").lstrip('/')
    return f"{base_url}/{clean_p}"


# --- API VIEWS ---

@api_view(['GET'])
def searchLocations(request):
    """
    API tìm kiếm địa điểm từ danh sách POIs dựa trên query 'name'.
    Hỗ trợ debounce từ Frontend.
    """
    query = request.GET.get('name', '').strip()
    if not query: return Response([])

    locations = PointOfInterest.objects.filter(name__icontains=query)[:15]
    results = []

    for loc in locations:
        results.append({
            "id": loc.poi_id or str(loc.id),
            "poi_id": loc.poi_id,
            "name": loc.name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "category": loc.category or "Địa danh",
            "image": _fix_image_path(request, loc.image),
            "image_list": [_fix_image_path(request, img) for img in loc.image_list if img],
            "description": loc.description,
            "address": loc.address or "Quận 1, TP. Hồ Chí Minh"
        })
    return Response(results)


@api_view(['POST'])
def smartItinerary(request):
    """
    API chính của hệ thống AI Smart Itinerary sử dụng Giải thuật Di truyền.
    """
    if Node is None:
        return Response({'status': 'error', 'message': 'Route API is not available.'}, status=503)

    data = request.data
    raw_stops = data.get("stops", [])
    prompt_text = data.get("prompt_text", "").strip()

    if len(raw_stops) < 1:
        return Response({"status": "error", "message": "Cần ít nhất 1 điểm dừng để bắt đầu."}, status=400)

    # --- Bước 0: Làm giàu dữ liệu Stops từ Database ---
    enriched_stops = []
    for s in raw_stops:
        sid = s.get("poi_id") or s.get("id")
        try:
            loc = PointOfInterest.objects.filter(poi_id=sid).first() or PointOfInterest.objects.filter(id=sid).first()
            if loc:
                enriched_stops.append({
                    "id": loc.poi_id or str(loc.id),
                    "poi_id": loc.poi_id,
                    "name": loc.name,
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "image": loc.image,
                    "image_list": loc.image_list,
                    "description": loc.description,
                    "category": loc.category,
                    "address": loc.address
                })
            else:
                enriched_stops.append(s)
        except:
            enriched_stops.append(s)

    # --- Bước 1: Tìm kiếm ngữ nghĩa (Semantic Search) ---
    bonus_candidates = []
    if prompt_text:
        bonus_candidates = find_related_pois(
            prompt_text=prompt_text,
            mandatory_stops=enriched_stops,
            top_k=15,
        )

    # --- Bước 2: Tối ưu hóa lộ trình (AI Genetic Algorithm) ---
    routes = build_top3_routes(
        mandatory_stops=enriched_stops,
        bonus_candidates=bonus_candidates,
        prompt_text=prompt_text
    )

    # --- Bước 3: Fix path ảnh ---
    for route in routes:
        for wp in route.get("waypoints", []):
            wp["image"] = _fix_image_path(request, wp.get("image"))
            wp["image_list"] = [_fix_image_path(request, img) for img in wp.get("image_list", []) if img]

    return Response({
        "status": "success",
        "prompt_text": prompt_text,
        "bonus_candidates": bonus_candidates[:5], 
        "routes": routes,
    })
