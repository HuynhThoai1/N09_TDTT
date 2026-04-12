
from ai_engine import utils
from ai_engine import algorithms

import unicodedata
import difflib
import re

"""!
@file RoutingEngine.py
@brief Lớp xử lý độc lập chứa logic định tuyến chính của hệ thống. 
       Tiếp nhận yêu cầu từ BE2, gọi các module xử lý và trả về kết quả mảng tọa độ.
"""

class RoutingEngine:
    """!
    @brief Class quản lý luồng dữ liệu tìm đường (Pipeline), từ lúc nạp đồ thị đến lúc xuất kết quả.
    """

    def __init__(self):
        """!
        @brief Hàm khởi tạo, tự động chuẩn bị sẵn biến chứa đồ thị (graph).
        """
        self.graph = None
        self.pois = []

    def loadMapData(self, nodesPath, edgesPath, poisPath):
        """!
        @brief Nạp dữ liệu từ các file JSON và xây dựng đồ thị mạng lưới.
        @details Gọi các hàm từ utils.py để đọc dữ liệu thô do tổ DATA cung cấp. 
                 Lưu đồ thị vào biến self.graph. Hàm này được BE2 gọi một lần khi khởi động.
        @param nodesPath (str): Đường dẫn đến file nodes.json.
        @param edgesPath (str): Đường dẫn đến file edges.json.
        @param poisPath (str): Đường dẫn đến file pois.json.
        @return bool: Trả về True nếu nạp dữ liệu và dựng đồ thị thành công, False nếu thất bại.
        """
        try:
            # 1. Xây dựng đồ thị từ utils
            self.graph = utils.buildDirectedGraph(nodesPath, edgesPath)
            
            # 2. Đọc dữ liệu POIs (dành cho logic tính điểm thú vị)
            self.pois = utils.loadPois(poisPath)
            return True
        except Exception as e:
            print(f"Lỗi khi nạp dữ liệu bản đồ: {e}")
            return False

    def calculateRoute(self, startNode, endNode, stops=None, totalMaxTime=0, preferences=None):
        """!
        @brief Tiếp nhận yêu cầu tìm đường, chạy thuật toán và xuất mảng tọa độ.
        @details Nhận tham số định tuyến, gọi algorithms để tìm danh sách ngã tư, 
                 sau đó ánh xạ thành mảng tọa độ (lat, lng) để trả về.
        @param startNode (str): Điểm xuất phát.
        @param endNode (str): Điểm kết thúc.
        @param stops (list): Danh sách các trạm dừng trung gian.
        @param totalMaxTime (float): Quỹ thời gian tối đa cho phép.
        @param preferences (list): Sở thích của người dùng.
        @return dict: Chứa chuỗi đường đi và mảng tọa độ [{lat, lng}, ...].
        """
        if stops is None:
            stops = []
        if preferences is None:
            preferences = []
            
        if not self.graph:
            return {"route_string": "", "coordinates": [], "error": "Chưa nạp dữ liệu bản đồ."}

        # 1. Gọi thuật toán lõi
        pathNodes = algorithms.findMultiStopRoute(self.graph, startNode, endNode, stops, totalMaxTime)
        
        if not pathNodes:
            return {"route_string": "Không tìm thấy đường đi phù hợp trong thời gian cho phép.", "coordinates": []}

        # 2. Chuyển pathNodes thành mảng tọa độ dựa trên dữ liệu self.graph
        coordinates = []
        for node in pathNodes:
            if self.graph.has_node(node):
                lat = self.graph.nodes[node].get('lat', 0.0)
                lng = self.graph.nodes[node].get('lng', 0.0)
                coordinates.append({"lat": lat, "lng": lng})

        # 3. Trả về format chuẩn
        routeString = " -> ".join(pathNodes)
        
        return {
            "route_string": f"Đường đi tìm được: {routeString}",
            "coordinates": coordinates
        }

class LocationMatcher:
    def __init__(self, available_nodes):
        self.node_map = {self.normalize_text(node): node for node in available_nodes}

    def normalize_text(self, text):
        if not text: return ""
        text = unicodedata.normalize('NFC', text).lower()
        return re.sub(r'\s+', ' ', text).strip()

    def find_node(self, user_input):
        cleaned_input = self.normalize_text(user_input)
        if cleaned_input in self.node_map:
            return self.node_map[cleaned_input], "Exact"

        matches = difflib.get_close_matches(cleaned_input, self.node_map.keys(), n=1, cutoff=0.7)
        if matches:
            return self.node_map[matches[0]], "Fuzzy"
        
        return None, "Not Found"


if __name__ == "__main__":
    engine = RoutingEngine()

    # Nạp dữ liệu từ thư mục data
    is_loaded = engine.loadMapData("../database/nodes.json", "../database/edges.json", "../database/pois.json")
    
    if not is_loaded:
        print("Không thể nạp dữ liệu bản đồ. Vui lòng kiểm tra lại đường dẫn.")
    else:
        print("--- HỆ THỐNG TÌM ĐƯỜNG ĐA TRẠM ---")
        
        available_nodes = list(engine.graph.nodes())
        print(f"Các điểm có sẵn trong bản đồ: {available_nodes[:15]}...")
        
        # Khởi tạo Matcher với dữ liệu node thực tế từ Graph
        matcher = LocationMatcher(available_nodes)
        
        raw_start = input("Nhập Điểm A: ")
        raw_end = input("Nhập Điểm B: ")   
        
        # Đưa input qua lớp nhận diện
        start, start_status = matcher.find_node(raw_start)
        end, end_status = matcher.find_node(raw_end)
        
        # Bắt lỗi nhập liệu
        if start_status == "Not Found":
            print(f"Lỗi: Điểm A '{raw_start}' không có trên bản đồ hoặc gõ sai quá nhiều!")
        elif end_status == "Not Found":
            print(f"Lỗi: Điểm B '{raw_end}' không có trên bản đồ hoặc gõ sai quá nhiều!")
        else:
            # Thông báo nếu hệ thống tự sửa lỗi gõ cho người dùng
            if start_status == "Fuzzy":
                print(f"[*] Đã tự động nhận diện Điểm A thành: {start}")
            if end_status == "Fuzzy":
                print(f"[*] Đã tự động nhận diện Điểm B thành: {end}")
                
            # Chạy thuật toán với tên Node chuẩn xác
            result = engine.calculateRoute(startNode=start, endNode=end, totalMaxTime=100.0)
            
            print("\n" + "="*40)
            print(result["route_string"]) 
            print(f"Mảng tọa độ:\n{result['coordinates']}")
            print("="*40)