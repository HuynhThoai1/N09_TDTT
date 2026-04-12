
import networkx as nx

"""!
@file algorithms.py
@brief Chứa các thuật toán cốt lõi để tìm đường đi đa trạm, bẻ lái qua các khu vực thú vị mà không vượt quá thời gian cho phép.
"""

def calculatePathMetrics(graph, path):
    """!
    @brief Tính toán tổng thời gian và tổng điểm thú vị của một lộ trình cụ thể.
    @details Duyệt qua danh sách các cạnh của đường đi, trích xuất thời gian di chuyển (t) và Điểm số thú vị (s).
    @param graph (nx.DiGraph): Đồ thị mạng lưới giao thông chứa dữ liệu t và s.
    @param path (list): Mảng chứa danh sách các nút thể hiện đường đi.
    @return tuple: (totalTime, totalScore)
    """
    totalTime = 0.0
    totalScore = 0.0
    
    if not path or len(path) < 2:
        return totalTime, totalScore

    for i in range(len(path) - 1):
        u = path[i]
        v = path[i+1]
        if graph.has_edge(u, v):
            totalTime += graph[u][v].get('t', 0.0)
            totalScore += graph[u][v].get('s', 0.0)
            
    return totalTime, totalScore


def findConstrainedPath(graph, sourceNode, targetNode, timeBudget):
    """!
    @brief Tìm đường đi tối ưu, cân bằng giữa độ thú vị và thời gian (Phiên bản TỐI ƯU HÓA SIÊU TỐC).
    @details Sử dụng K-shortest paths để duyệt các lộ trình từ nhanh nhất đến chậm nhất, 
             ngắt sớm (early stopping) khi vượt ngân sách thời gian.
    """
    bestPath = []
    maxScore = -1.0
    minTime = float('inf')
    
    try:
        # Sử dụng thuật toán Yen (K-shortest paths) có sẵn của NetworkX
        # Generator này sinh ra lộ trình theo thứ tự thời gian di chuyển ('t') tăng dần
        paths_generator = nx.shortest_simple_paths(graph, sourceNode, targetNode, weight='t')
        
        paths_checked = 0
        MAX_PATHS = 500 # Chốt chặn: Chỉ kiểm tra tối đa 500 lộ trình tiềm năng nhất để chống treo máy
        
        for path in paths_generator:
            paths_checked += 1
            
            # Gọi hàm tính toán điểm số và thời gian (hàm này đã có sẵn ở đầu file)
            currentTime, currentScore = calculatePathMetrics(graph, path)
            
            # CẮT TỈA (PRUNING) CỰC MẠNH:
            # Vì các đường được sinh ra có thời gian tăng dần, 
            # nên nếu đường này lố giờ -> các đường sau chắc chắn cũng lố giờ -> Break luôn!
            if currentTime > timeBudget:
                break
                
            # Cập nhật kỷ lục nếu tìm thấy đường thú vị hơn, hoặc thú vị bằng nhưng đi nhanh hơn
            if currentScore > maxScore or (currentScore == maxScore and currentTime < minTime):
                maxScore = currentScore
                minTime = currentTime
                bestPath = list(path)
                
            # Dừng nếu đã quét đủ số lượng cho phép
            if paths_checked >= MAX_PATHS:
                break
                
        # Nếu ngân sách quá gắt, không có đường nào thỏa mãn timeBudget -> Trả về đường đi nhanh nhất tuyệt đối
        if not bestPath:
            return nx.shortest_path(graph, sourceNode, targetNode, weight='t')
            
        return bestPath
        
    except nx.NetworkXNoPath:
        # Bắt lỗi nếu 2 điểm bị cô lập, không có đường nối
        return []



def findMultiStopRoute(graph, startNode, endNode, stops, totalMaxTime):
    """!
    @brief Định tuyến đa trạm, nối điểm đầu, các trạm dừng bắt buộc và điểm cuối thành một lộ trình.
    @details Phân chia quỹ thời gian đều cho các chặng và gọi findConstrainedPath để giải quyết.
    @param graph (nx.DiGraph): Đồ thị mạng lưới.
    @param startNode (str): Nút bắt đầu hành trình.
    @param endNode (str): Nút kết thúc hành trình.
    @param stops (list): Danh sách các trạm dừng bắt buộc.
    @param totalMaxTime (float): Quỹ thời gian tối đa cho toàn bộ hành trình.
    @return list: Mảng chứa các nút theo thứ tự liên tục.
    """
    waypoints = [startNode] + stops + [endNode]
    fullRoute = []
    segmentsCount = len(waypoints) - 1
    
    if segmentsCount == 0:
        return fullRoute
        
    # Phân bổ quỹ thời gian (Giả định chia đều cho PoC)
    timePerSegment = totalMaxTime / segmentsCount 

    for i in range(segmentsCount):
        segmentStart = waypoints[i]
        segmentEnd = waypoints[i+1]
        
        segmentPath = findConstrainedPath(graph, segmentStart, segmentEnd, timePerSegment)
        
        if not segmentPath:
            return [] # Trả về rỗng nếu có một chặng không thể đi tới
            
        if i == 0:
            fullRoute.extend(segmentPath)
        else:
            # Bỏ phần tử đầu tiên của chặng tiếp theo để tránh lặp lại nút giao nối
            fullRoute.extend(segmentPath[1:]) 

    return fullRoute

