from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from tours.models import POI
from .serializers import POISerializer

# Gắn biển cấm: Chỉ cho khách tới LẤY đồ (GET), cấm GỬI đồ lên (POST)
@api_view(['GET'])
def get_all_pois(request):
    # 1. Mở kho, gom toàn bộ điểm thú vị (quán cafe, công viên...) ra
    danh_sach_diem_den = POI.objects.all()
    
    # 2. Đưa cục dữ liệu đó vào máy đóng gói (many=True nghĩa là có nhiều món cùng lúc)
    may_dong_goi = POISerializer(danh_sach_diem_den, many=True)
    
    # 3. Trả hộp JSON hoàn chỉnh ra ngoài cho Frontend vẽ lên bản đồ
    return Response(may_dong_goi.data)

@api_view(['POST'])
def calculate_route(request):
    # 1. Nhận thông tin FE gửi lên (Điểm A, Điểm B, Thời gian cho phép đi lạc)
    data_tu_fe = request.data

    duong_di_gia_mao = {
        "status": "success",
        "message": "Đây là tọa độ giả để team Frontend test vẽ bản đồ nha!",
        "route_info": {
            "total_time_minutes": 15,    # Đi hết 15 phút
            "serendipity_score": 8.5     # Độ chill 8.5 điểm
        },
        "path_coordinates": [
            {"lat": 10.779785, "lng": 106.699028}, # Tọa độ Nhà thờ Đức Bà
            {"lat": 10.776111, "lng": 106.698333}, # Tọa độ Ủy ban Nhân dân
            {"lat": 10.772500, "lng": 106.698056}  # Tọa độ Chợ Bến Thành
        ]
    }

    # Quăng cục JSON giả đó về cho FE
    return Response(duong_di_gia_mao)