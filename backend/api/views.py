import sys
import json
from pathlib import Path
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

try:
    from tours.models import POI, Node
except ImportError:
    POI = None
    Node = None

try:
    from .serializers import POISerializer
except ImportError:
    POISerializer = None

from .ai_services import generate_vector, generate_image_vector

BASE_DIR = Path(settings.BASE_DIR)
PROJECT_ROOT = BASE_DIR.parent
sys.path.append(str(PROJECT_ROOT))

try:
    from ai_engine.RoutingEngine import RoutingEngine, LocationMatcher
    AI_ENGINE_AVAILABLE = True
except ModuleNotFoundError:
    RoutingEngine = None
    LocationMatcher = None
    AI_ENGINE_AVAILABLE = False


class DemoLocationMatcher:
    def __init__(self):
        self.names = list(Node.objects.values_list('name', flat=True)) if Node else []

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


def _resolve_output_file(filename):
    for folder in DATA_ROOT_CANDIDATES:
        if folder.exists():
            return folder / filename
    return PROJECT_ROOT / 'database' / filename


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
    if POI is None or POISerializer is None:
        return Response({'status': 'error', 'message': 'POI API is not available.'}, status=503)

    pois = POI.objects.all()
    serializer = POISerializer(pois, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def calculateRoute(request):
    """
    API tiếp nhận Điểm A, Điểm B để tính toán đường đi 'chill' nhất.
    """
    if Node is None:
        return Response({'status': 'error', 'message': 'Route API is not available.'}, status=503)

    data = request.data
    raw_start = data.get('start_location', '')
    raw_end = data.get('end_location', '')
    
    try:
        max_time = float(data.get('extra_time', 100.0))
    except (ValueError, TypeError):
        return Response({'status': 'error', 'message': 'Tham số extra_time không hợp lệ (cần định dạng số).'}, status=400)

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


@api_view(['POST'])
def get_text_embedding(request):
    """
    API chuyển đổi văn bản (text) thành Vector (embedding).
    """
    text = str(request.data.get('text', '')).strip()
    if not text:
        return Response(
            {'status': 'error', 'message': 'Vui long cung cap truong "text".'},
            status=400,
        )

    try:
        vector = generate_vector(text)
    except RuntimeError as exc:
        return Response({'status': 'error', 'message': str(exc)}, status=503)
    except Exception as exc:
        return Response({'status': 'error', 'message': str(exc)}, status=500)

    return Response(
        {
            'status': 'success',
            'text': text,
            'dimensions': len(vector),
            'embedding': vector,
        },
        status=200,
    )


@api_view(['POST'])
def get_image_embedding(request):
    """
    API chuyển đổi ảnh (upload file) thành Vector (embedding) và lưu vào JSON.
    """
    imageFile = request.FILES.get('image')
    if imageFile is None:
        return Response(
            {'status': 'error', 'message': 'Vui long upload file anh qua truong "image".'},
            status=400,
        )

    try:
        imageBytes = imageFile.read()
        vector = generate_image_vector(imageBytes)
    except ValueError as exc:
        return Response({'status': 'error', 'message': str(exc)}, status=400)
    except RuntimeError as exc:
        return Response({'status': 'error', 'message': str(exc)}, status=503)
    except Exception as exc:
        return Response({'status': 'error', 'message': str(exc)}, status=500)

    outputPath = _resolve_output_file('image_vectors.json')
    outputPath.parent.mkdir(parents=True, exist_ok=True)

    record = {
        'id': str(request.data.get('id', '')).strip() or imageFile.name,
        'filename': imageFile.name,
        'content_type': imageFile.content_type,
        'size': imageFile.size,
        'dimensions': len(vector),
        'embedding': vector,
    }

    existing_records = []
    if outputPath.exists():
        try:
            with outputPath.open('r', encoding='utf-8') as f:
                existing_records = json.load(f)
            if not isinstance(existing_records, list):
                existing_records = []
        except Exception:
            existing_records = []

    existing_records.append(record)
    with outputPath.open('w', encoding='utf-8') as f:
        json.dump(existing_records, f, ensure_ascii=False, indent=2)

    return Response(
        {
            'status': 'success',
            'saved_to': str(outputPath),
            'id': record['id'],
            'dimensions': record['dimensions'],
            'embedding': record['embedding'],
        },
        status=200,
    )
