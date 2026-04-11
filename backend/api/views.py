import os
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from tours.models import POI
from .serializers import POISerializer

# Import bộ não AI 
from ai_engine.RoutingEngine import RoutingEngine, LocationMatcher

engine = RoutingEngine()

# Thiết lập đường dẫn đến các file JSON trong folder data
BASE_DIR = settings.BASE_DIR
nodesPath = os.path.join(BASE_DIR, 'data', 'nodes.json')
edgesPath = os.path.join(BASE_DIR, 'data', 'edges.json')
poisPath = os.path.join(BASE_DIR, 'data', 'pois.json')

# Nạp dữ liệu vào Engine
isLoaded = engine.loadMapData(nodesPath, edgesPath, poisPath)

# Khởi tạo bộ sửa lỗi chính tả (Matcher) nếu nạp data thành công
matcher = None
if isLoaded:
    available_nodes = list(engine.graph.nodes())
    matcher = LocationMatcher(available_nodes)
    print("AI Engine đã sẵn sàng!")
else:
    print("CẢNH BÁO: Không tìm thấy dữ liệu tại folder /data/")


# --- CÁC HÀM XỬ LÝ API ---

@api_view(['GET'])
def getAllPOIs(request):
    """
    API lấy danh sách toàn bộ điểm thú vị để FE hiển thị lên bản đồ.
    """
    pois = POI.objects.all()
    serializer = POISerializer(pois, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def calculateRoute(request):
    """
    API tiếp nhận Điểm A, Điểm B để tính toán đường đi 'chill' nhất.
    """
    data = request.data
    raw_start = data.get('start_location', '')
    raw_end = data.get('end_location', '')
    max_time = float(data.get('extra_time', 100.0))

    # 1. Kiểm tra nếu chưa nạp được bản đồ
    if not isLoaded or not matcher:
        return Response({"status": "error", "message": "Dữ liệu bản đồ chưa sẵn sàng."}, status=500)

    # 2. Sử dụng Matcher của Tài để chuẩn hóa tên địa điểm (Sửa lỗi chính tả)
    start_node, start_status = matcher.find_node(raw_start)
    end_node, end_status = matcher.find_node(raw_end)

    if start_status == "Not Found" or end_status == "Not Found":
        return Response({
            "status": "error",
            "message": f"Không tìm thấy địa điểm: {raw_start if start_status == 'Not Found' else raw_end}"
        }, status=404)

    # 3. Gọi thuật toán của Tài để tính toán đường đi thật
    result = engine.calculateRoute(
        startNode=start_node,
        endNode=end_node,
        totalMaxTime=max_time
    )

    # 4. Trả kết quả về cho Frontend
    if not result.get('coordinates'):
        return Response({
            "status": "error",
            "message": result.get('route_string', "Không tìm thấy đường đi phù hợp.")
        }, status=404)

    return Response({
        "status": "success",
        "input_processed": {
            "start": start_node,
            "end": end_node,
            "match_type": f"Start:{start_status}, End:{end_status}"
        },
        "route_info": {
            "description": result['route_string'],
            "total_time_allowed": max_time
        },
        "path_coordinates": result['coordinates']
    })