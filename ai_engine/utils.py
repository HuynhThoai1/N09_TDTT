
import json
import os
import networkx as nx

# Khai báo hằng số theo chuẩn UPPER_SNAKE_CASE
DEFAULT_ENCODING = 'utf-8'

def loadJsonData(filePath):
    """!
    @brief Đọc dữ liệu từ file JSON.
    @details Hàm hỗ trợ tái sử dụng để đọc file nodes, edges và pois nhằm tránh lặp code.
    @param filePath Đường dẫn dạng string tới file JSON cần đọc.
    @return Dictionary hoặc List chứa dữ liệu đã được parse từ JSON.
    @exception FileNotFoundError Nếu không tìm thấy file tại đường dẫn được cung cấp.
    """
    if not os.path.exists(filePath):
        raise FileNotFoundError(f"Lỗi: Không tìm thấy file dữ liệu tại {filePath}")
        
    with open(filePath, 'r', encoding=DEFAULT_ENCODING) as file:
        return json.load(file)

def buildDirectedGraph(nodesFile, edgesFile):
    """!
    @brief Khởi tạo đồ thị mạng lưới giao thông có hướng (đã mở thành 2 chiều).
    @details Sử dụng networkx để dựng DiGraph. Hàm sẽ nạp các đỉnh (ngã tư) và các cạnh (đoạn đường) kèm theo thuộc tính cốt lõi.
    @param nodesFile Đường dẫn tới file nodes.json.
    @param edgesFile Đường dẫn tới file edges.json.
    @return nx.DiGraph Đồ thị đã được gán đầy đủ thuộc tính t và s.
    """
    graph = nx.DiGraph()
    
    # Sử dụng hàm phụ để không lặp code
    nodesData = loadJsonData(nodesFile)
    edgesData = loadJsonData(edgesFile)
    
    # 1. Thêm các đỉnh (Nodes) với tọa độ
    # Xử lý thông minh: Chấp nhận cả dữ liệu dạng Dictionary (mới) và List (cũ)
    if isinstance(nodesData, dict):
        for node_name, attrs in nodesData.items():
            graph.add_node(
                node_name, 
                lat=attrs.get('lat', 0.0), 
                lng=attrs.get('lng', 0.0)
            )
    elif isinstance(nodesData, list):
        for node in nodesData:
            graph.add_node(
                node['id'], 
                lat=node.get('lat', 0.0), 
                lng=node.get('lng', 0.0)
            )
        
    # 2. Thêm các cạnh (Edges) và gán thuộc tính t (thời gian), s (độ thú vị)
    for edge in edgesData:
        source = edge['source']
        target = edge['target']
        
        # Lấy 'time_min' (format mới) hoặc 't' (format cũ)
        timeWeight = edge.get('time_min', edge.get('t', 0.0))  
        scoreWeight = edge.get('s', 0.0) # s: Điểm số thú vị
        
        # Thêm chiều đi (source -> target)
        graph.add_edge(source, target, t=timeWeight, s=scoreWeight)
        
        # Thêm chiều về (target -> source) để biến thành đường 2 chiều
        graph.add_edge(target, source, t=timeWeight, s=scoreWeight)
        
    return graph




def loadPois(poisFile):
    """!
    @brief Nạp danh sách các Điểm thú vị (Points of Interest - POIs).
    @details Dữ liệu này sẽ được dùng cho ScoringEngine để linh hoạt bẻ lái lộ trình sau này.
    @param poisFile Đường dẫn tới file pois.json.
    @return List chứa danh sách các POIs.
    """
    return loadJsonData(poisFile)

# --- Khối code kiểm thử cục bộ (Sẽ không chạy khi được import vào module khác) ---
if __name__ == "__main__":
    NODES_PATH = "data/nodes.json"
    EDGES_PATH = "data/edges.json"
    POIS_PATH = "data/pois.json"   
    
    try:
        # Khởi tạo đồ thị
        routeGraph = buildDirectedGraph(NODES_PATH, EDGES_PATH)
        poiList = loadPois(POIS_PATH)
        print(f"Khởi tạo đồ thị thành công! Số đỉnh: {routeGraph.number_of_nodes()}, Số cạnh: {routeGraph.number_of_edges()}")
    except Exception as e:
        print(f"Lỗi: {e}")