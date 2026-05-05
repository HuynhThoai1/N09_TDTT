import sys
import json
from pathlib import Path
from django.shortcuts import get_object_or_404
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import PointOfInterest, SharedRoute, VibeTag, UserProfile
from .serializers import (
    POISerializer, VibeTagSerializer, UserProfileSerializer, 
    UserVibeUpdateSerializer
)

from .semantic_search import find_related_pois
from .itinerary_optimizer import build_top3_routes
from .goong_service import goong_autocomplete, goong_place_detail, goong_geocode, goong_reverse_geocode

# --- HELPER FUNCTIONS ---

def _build_prompt_with_vibes(user, prompt_text):
    """
    Bí mật lấy sở thích của người dùng từ DB và nối vào prompt.
    Ví dụ: "Tôi muốn đi dạo Quận 1. Ưu tiên: di tích lịch sử, bảo tàng, yên tĩnh"
    """
    try:
        vibe_context = user.profile.get_prompt_context()
        if vibe_context:
            return f"{prompt_text}. {vibe_context}"
    except Exception:
        pass  # Người dùng chưa đăng nhập hoặc chưa chọn vibe → fallback bình thường
    return prompt_text

def _fix_image_path(request, p):
    """Sửa lỗi đường dẫn ảnh (assets -> media) và đảm bảo có domain."""
    if not p: return ""
    base_url = request.build_absolute_uri('/')[:-1]
    # Chuyển assets sang media và xóa domain dư thừa nếu có
    clean_p = str(p).replace("assets/images", "media").replace("http://localhost:8000/", "").lstrip('/')
    return f"{base_url}/{clean_p}"

# --- VIBE API VIEWS ---

@api_view(['GET'])
def getVibeTags(request):
    """
    API lấy toàn bộ thẻ sở thích, nhóm theo category.
    Dùng cho màn hình Onboarding sau khi đăng ký.
    GET /api/vibes/
    """
    tags = VibeTag.objects.all()

    grouped = {}
    for tag in tags:
        cat_key   = tag.category
        cat_label = tag.get_category_display()

        if cat_key not in grouped:
            grouped[cat_key] = {
                "category_key":   cat_key,
                "category_label": cat_label,
                "tags": []
            }
        grouped[cat_key]["tags"].append(VibeTagSerializer(tag).data)

    return Response(list(grouped.values()))


@api_view(['GET', 'POST'])
def userVibes(request):
    """
    GET  — Xem thẻ vibe hiện tại (dùng cho Sidebar / Profile).
    POST — Lưu lựa chọn mới (dùng cho màn hình Onboarding).
    /api/profile/vibes/
    """
    if request.method == 'GET':
            if not request.user.is_authenticated:
                return Response({"vibes": []})
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data)

    if request.method == 'POST':
        serializer = UserVibeUpdateSerializer(data=request.data)
        if serializer.is_valid():
            if not request.user.is_authenticated:
                return Response({"message": "Đã lưu sở thích tạm thời!"})
            serializer.save(user=request.user)
            return Response({"message": "Đã lưu sở thích thành công!"})
        return Response(serializer.errors, status=400)

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
    data = request.data
    raw_stops = data.get("stops", [])
    prompt_text = data.get("prompt_text", "").strip()

    if len(raw_stops) < 1:
        return Response({"status": "error", "message": "Cần ít nhất 1 điểm dừng để bắt đầu."}, status=400)

    if request.user.is_authenticated:
        prompt_text = _build_prompt_with_vibes(request.user, prompt_text)

    # --- Bước 0: Làm giàu dữ liệu Stops từ Database ---
    enriched_stops = []
    for s in raw_stops:
        sid = s.get("poi_id") or s.get("id")
        lat = s.get("latitude")
        lng = s.get("longitude")
        
        # Thử tìm trong DB nội bộ trước
        loc = None
        try:
            loc = PointOfInterest.objects.filter(poi_id=sid).first() or PointOfInterest.objects.filter(id=sid).first()
        except:
            pass
        
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
        elif lat and lng:
            # Địa điểm từ Goong (không có trong DB) → dùng trực tiếp dữ liệu FE gửi lên
            enriched_stops.append({
                "id": sid or f"goong_{lat}_{lng}",
                "poi_id": sid,
                "name": s.get("name", "Điểm chọn"),
                "latitude": float(lat),
                "longitude": float(lng),
                "image": "",
                "image_list": [],
                "description": s.get("name", ""),
                "category": "Địa danh",
                "address": s.get("address", "")
            })
        else:
            enriched_stops.append(s)
    
    print(f"[SmartItinerary] Enriched {len(enriched_stops)} stops: {[s.get('name') for s in enriched_stops]}")

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


@api_view(['POST'])
def createSharedRoute(request):
    """Tạo route chia sẻ public và trả về share_id + share_url."""
    data = request.data or {}
    route = data.get('route') or data.get('selectedRoute')

    if not route:
        return Response({"status": "error", "message": "Thiếu dữ liệu route."}, status=400)

    route_payload = {
        "route": route,
        "stops": data.get('stops', []),
        "prompt_text": (data.get('prompt_text') or '').strip(),
        "created_from": data.get('created_from', 'frontend'),
    }

    shared_route = SharedRoute.objects.create(
        route_data=route_payload,
        creator_ip=request.META.get('REMOTE_ADDR'),
    )

    return Response({
        "status": "success",
        "share_id": shared_route.share_id,
        "share_url": request.build_absolute_uri(f"/share/{shared_route.share_id}"),
        "route_data": shared_route.route_data,
        "created_at": shared_route.created_at,
    }, status=201)


@api_view(['GET'])
def getSharedRoute(request, share_id):
    """Lấy dữ liệu route chia sẻ ở chế độ chỉ đọc."""
    shared_route = get_object_or_404(SharedRoute, share_id=share_id)

    shared_route.view_count += 1
    shared_route.save(update_fields=['view_count'])

    return Response({
        "status": "success",
        "share_id": shared_route.share_id,
        "share_url": request.build_absolute_uri(f"/share/{shared_route.share_id}"),
        "route_data": shared_route.route_data,
        "created_at": shared_route.created_at,
        "view_count": shared_route.view_count,
    })


# --- GOONG MAP API PROXY ---

@api_view(['GET'])
def goongAutocomplete(request):
    """
    API 1: Gợi ý địa điểm khi người dùng gõ tìm kiếm.
    Sử dụng Goong Place AutoComplete thay thế cho tìm kiếm offline.
    Query params: ?input=<text>&location=<lat,lng>&limit=<number>
    """
    input_text = request.GET.get('input', '').strip()
    if not input_text:
        return Response({"error": "Thiếu tham số 'input'."}, status=400)

    location = request.GET.get('location', None)
    limit = int(request.GET.get('limit', 10))
    data = goong_autocomplete(input_text, location=location, limit=limit)
    return Response(data)


@api_view(['GET'])
def goongPlaceDetail(request):
    """
    API 2: Lấy thông tin chi tiết của một địa điểm bằng place_id.
    Sử dụng Goong Place Detail.
    Query params: ?place_id=<id>
    """
    place_id = request.GET.get('place_id', '').strip()
    if not place_id:
        return Response({"error": "Thiếu tham số 'place_id'."}, status=400)

    data = goong_place_detail(place_id)
    return Response(data)


@api_view(['GET'])
def goongGeocode(request):
    """
    API 3: Chuyển đổi địa chỉ ↔ tọa độ (Forward & Reverse Geocoding).
    Sử dụng Goong Geocode.
    Query params: ?address=<text> HOẶC ?latlng=<lat,lng>
    """
    address = request.GET.get('address', '').strip()
    latlng = request.GET.get('latlng', '').strip()

    if not address and not latlng:
        return Response({"error": "Cần truyền 'address' hoặc 'latlng'."}, status=400)

    if latlng:
        parts = latlng.split(',')
        if len(parts) != 2:
            return Response({"error": "Định dạng latlng không hợp lệ. VD: 10.7769,106.7009"}, status=400)
        data = goong_reverse_geocode(parts[0].strip(), parts[1].strip())
    else:
        data = goong_geocode(address)

    return Response(data)

# --- Vibe Tags ---
