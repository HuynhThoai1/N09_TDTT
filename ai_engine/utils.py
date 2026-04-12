import json
import os
import networkx as nx

DEFAULT_ENCODING = 'utf-8'

def loadJsonData(filePath):
    if not os.path.exists(filePath):
        raise FileNotFoundError(f"Lỗi: Không tìm thấy file dữ liệu tại {filePath}")
    with open(filePath, 'r', encoding=DEFAULT_ENCODING) as file:
        return json.load(file)

def buildDirectedGraph(nodesFile, edgesFile):
    """!
    @brief Nạp dữ liệu từ Thành viên 6, tự động đồng bộ hóa format.
    """
    graph = nx.DiGraph()
    nodesData = loadJsonData(nodesFile)
    edgesData = loadJsonData(edgesFile)
    
    # Tạo từ điển dịch ID (số nguyên) sang Tên (chuỗi)
    id_to_name = {}
    
    # 1. Xử lý Nodes (File của thành viên 6)
    for node in nodesData:
        node_id = node.get('id')
        node_name = node.get('name')
        id_to_name[node_id] = node_name
        
        # Nạp vào graph bằng TÊN CHỮ, chuẩn hóa tọa độ về lat/lng
        graph.add_node(
            node_name, 
            lat=node.get('latitude', node.get('lat', 0.0)), 
            lng=node.get('longitude', node.get('lng', 0.0))
        )
        
    # 2. Xử lý Edges (File của thành viên 6)
    for edge in edgesData:
        source_id = edge.get('source_id')
        target_id = edge.get('target_id')
        
        # Bỏ qua nếu cạnh nối tới ID không tồn tại
        if source_id not in id_to_name or target_id not in id_to_name:
            continue
            
        source_name = id_to_name[source_id]
        target_name = id_to_name[target_id]
        
        # Quy đổi thời gian từ giây sang phút
        timeWeight = edge.get('time_seconds', 0.0) / 60.0 
        scoreWeight = edge.get('s', 0.0)
        
        # Thêm cạnh 2 chiều
        graph.add_edge(source_name, target_name, t=timeWeight, s=scoreWeight)
        graph.add_edge(target_name, source_name, t=timeWeight, s=scoreWeight)
        
    return graph

def loadPois(poisFile):
    return loadJsonData(poisFile)

if __name__ == "__main__":
    NODES_PATH = "../database/nodes.json"
    EDGES_PATH = "../database/edges.json"
    POIS_PATH = "../database/pois.json"   
    try:
        routeGraph = buildDirectedGraph(NODES_PATH, EDGES_PATH)
        print(f"Khởi tạo đồ thị thành công! Số đỉnh: {routeGraph.number_of_nodes()}, Số cạnh: {routeGraph.number_of_edges()}")
    except Exception as e:
        print(f"Lỗi: {e}")