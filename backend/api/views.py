import sys
import json
from pathlib import Path
from django.shortcuts import get_object_or_404
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.authentication import FirebaseAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import authentication_classes, permission_classes

from .models import PointOfInterest, SharedRoute, VibeTag, UserProfile
from .serializers import (
    POISerializer, VibeTagSerializer, UserProfileSerializer, 
    UserVibeUpdateSerializer
)

from .semantic_search import find_related_pois
from .itinerary_optimizer import build_top3_routes
from .goong_service import goong_autocomplete, goong_place_detail, goong_geocode, goong_reverse_geocode
from .ai_services import analyze_prompt_clarification

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserProfile
from .serializers import UserProfileSerializer
from rest_framework.decorators import api_view, permission_classes, authentication_classes

@api_view(['GET', 'POST'])
@authentication_classes([FirebaseAuthentication]) 
@permission_classes([IsAuthenticated])
def userProfile(request):
    # Lấy profile hoặc tạo mới nếu chưa có
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

def _build_prompt_with_vibes(user, prompt_text):
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


@api_view(['GET'])
def getVibeTags(request):
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


@api_view(['POST', 'GET'])
@authentication_classes([FirebaseAuthentication]) 
@permission_classes([IsAuthenticated])       
def userVibes(request):
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

@api_view(['GET'])
def searchLocations(request):
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
    data = request.data
    raw_stops = data.get("stops", [])
    prompt_text = data.get("prompt_text", "").strip()

    # --- Bước 0: AI Gatekeeper (Kiểm tra và hỏi ngược ngay lập tức) ---
    is_confirmed = data.get("is_confirmed", False)
    ai_clarification = data.get("ai_clarification")

    # Nếu chưa xác nhận và chưa có câu trả lời phỏng vấn, kiểm tra độ đầy đủ của prompt
    if not is_confirmed and not ai_clarification:
        analysis = analyze_prompt_clarification(prompt_text)
        if not analysis.get("is_sufficient", True):
            print(f"[AI Gatekeeper] Phản hồi sớm: Prompt '{prompt_text}' chưa đủ thông tin.")
            return Response({
                "status": "needs_clarification",
                "questions": analysis.get("questions", [])
            })

    # --- Bước 1: Khởi tạo dữ liệu & Validation ---
    if len(raw_stops) < 1:
        return Response({"status": "error", "message": "Cần ít nhất 1 điểm dừng để bắt đầu."}, status=400)

    user_vibes = []
    if request.user.is_authenticated:
        prompt_text = _build_prompt_with_vibes(request.user, prompt_text)
        try:
            profile = request.user.profile
            user_vibes = list(profile.vibes.values('label'))
        except Exception:
            pass

    # Nếu người dùng đã trả lời phỏng vấn, nối vào prompt để làm giàu ngữ cảnh
    if ai_clarification:
        clarification_text = ". ".join([f"{k}: {v}" for k, v in ai_clarification.items() if v])
        if clarification_text:
            prompt_text = f"{prompt_text}. Ngữ cảnh bổ sung: {clarification_text}"
            print(f"[AI Gatekeeper] Prompt đã được làm giàu: {prompt_text}")

    # --- Bước 0: Làm giàu dữ liệu Stops từ Database ---
    enriched_stops = []
    for s in raw_stops:
        sid = s.get("poi_id") or s.get("id")
        lat = s.get("latitude")
        lng = s.get("longitude")
        
        # tìm trong DB nội bộ 
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

    # Tìm kiếm ngữ nghĩa 
    bonus_candidates = []
    if prompt_text:
        bonus_candidates = find_related_pois(
            prompt_text=prompt_text,
            mandatory_stops=enriched_stops,
            top_k=15,
        )

    # Tối ưu hóa lộ trình (AI Genetic Algorithm)
    routes = build_top3_routes(
        mandatory_stops=enriched_stops,
        bonus_candidates=bonus_candidates,
        prompt_text=prompt_text,
        user_vibes=user_vibes
    )

    # Fix path ảnh 
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

@api_view(['GET'])
def goongAutocomplete(request):
    input_text = request.GET.get('input', '').strip()
    if not input_text:
        return Response({"error": "Thiếu tham số 'input'."}, status=400)

    location = request.GET.get('location', None)
    limit = int(request.GET.get('limit', 10))
    data = goong_autocomplete(input_text, location=location, limit=limit)
    return Response(data)


@api_view(['GET'])
def goongPlaceDetail(request):
    place_id = request.GET.get('place_id', '').strip()
    if not place_id:
        return Response({"error": "Thiếu tham số 'place_id'."}, status=400)

    data = goong_place_detail(place_id)
    return Response(data)


@api_view(['GET'])
def goongGeocode(request):
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

@api_view(['GET', 'POST'])
def reindex_vectors(request):
    """
    Endpoint nội bộ để tính toán lại text_vector cho các địa điểm.
    Chạy trong process của Django để tận dụng model đã nạp sẵn vào RAM, tránh lỗi Lock cache file.
    """
    from .semantic_search import _get_sbert_model
    import json
    
    sbert_model = _get_sbert_model()
    if not sbert_model:
        return Response({"error": "SBERT model not loaded yet."}, status=500)
        
    pois = PointOfInterest.objects.all()
    total = pois.count()
    count = 0
    
    for poi in pois:
        text = f"{poi.name or ''} {poi.category or ''} {poi.description or ''}"
        try:
            vector = sbert_model.encode(text).tolist()
            poi.text_vector = vector
            poi.save()
            count += 1
        except Exception as e:
            print(f"[Reindex] Error processing POI {poi.id}: {e}")
            
    return Response({
        "message": "Reindex successful.",
        "total_pois": total,
        "indexed_pois": count
    })

# --- Vibe Tags ---
