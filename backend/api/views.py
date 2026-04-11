from pathlib import Path

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from tours.models import POI, Node
from .serializers import POISerializer

try:
    from ai_engine.RoutingEngine import RoutingEngine, LocationMatcher
    AI_ENGINE_AVAILABLE = True
except ModuleNotFoundError:
    RoutingEngine = None
    LocationMatcher = None
    AI_ENGINE_AVAILABLE = False


class DemoLocationMatcher:
    def __init__(self):
        self.names = list(Node.objects.values_list('name', flat=True))

    def find_node(self, raw_name):
        query = (raw_name or '').strip()
        if not query:
            return '', 'Not Found'

        for name in self.names:
            if name.lower() == query.lower():
                return name, 'Exact Match'

        for name in self.names:
            if query.lower() in name.lower():
                return name, 'Partial Match'

        return query, 'Not Found'


class DemoRoutingEngine:
    def loadMapData(self, *_args, **_kwargs):
        return True

    def calculateRoute(self, startNode, endNode, totalMaxTime=100.0):
        try:
            start = Node.objects.get(name=startNode)
            end = Node.objects.get(name=endNode)
        except Node.DoesNotExist:
            return {
                'route_string': 'Khong tim thay node de mo phong tuyen duong.',
                'coordinates': []
            }

        return {
            'route_string': f'Demo route from {startNode} to {endNode} (max {totalMaxTime} minutes).',
            'coordinates': [
                [start.latitude, start.longitude],
                [end.latitude, end.longitude],
            ]
        }


engine = RoutingEngine() if AI_ENGINE_AVAILABLE else DemoRoutingEngine()

BASE_DIR = Path(settings.BASE_DIR)
PROJECT_ROOT = BASE_DIR.parent
DATA_ROOT_CANDIDATES = [
    BASE_DIR / 'data',
    PROJECT_ROOT / 'database',
    PROJECT_ROOT / 'data',
]


def _resolve_data_file(filename):
    for folder in DATA_ROOT_CANDIDATES:
        candidate = folder / filename
        if candidate.exists():
            return str(candidate)
    return str((BASE_DIR / 'data') / filename)


nodesPath = _resolve_data_file('nodes.json')
edgesPath = _resolve_data_file('edges.json')
poisPath = _resolve_data_file('pois.json')

isLoaded = engine.loadMapData(nodesPath, edgesPath, poisPath)

matcher = None
if isLoaded:
    if AI_ENGINE_AVAILABLE:
        available_nodes = list(engine.graph.nodes())
        matcher = LocationMatcher(available_nodes)
        print('AI Engine da san sang!')
    else:
        matcher = DemoLocationMatcher()
        print('Demo mode da san sang (khong can ai_engine).')
else:
    print('CANH BAO: Khong tim thay du lieu ban do.')


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