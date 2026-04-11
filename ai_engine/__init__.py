
# Mục tiêu: Khai báo thư mục ai_engine là một gói (package) Python. Nó giúp các thành viên khác (như BE2) 
# có thể gọi from ai_engine import RoutingEngine một cách gọn gàng.
# Làm những gì: Export class chính ra ngoài.
# Đầu vào: Không có.
# Đầu ra: Quyền truy cập vào các module bên trong cho các phần khác của hệ thống.

"""!
@file __init__.py
@brief File khởi tạo package ai_engine.

@details File này đánh dấu thư mục hiện tại là một Python package. 
         Nó định nghĩa các API công khai (Public API) của module AI, 
         giúp các module khác (như Backend Django) dễ dàng import và sử dụng 
         mà không cần phải đào sâu vào từng file con bên trong.
"""

# Import các thành phần cốt lõi từ các file con trong cùng thư mục
from .RoutingEngine import RoutingEngine
from .algorithms import findMultiStopRoute, findConstrainedPath, calculatePathMetrics
from .utils import loadJsonFile, buildDirectedGraph

"""!
@brief Danh sách các Class và Hàm được phép export ra ngoài.
@details Khi BE2 gọi lệnh `from ai_engine import *`, hệ thống sẽ chỉ nhả ra 
         những cái tên được khai báo trong biến __all__ này. Điều này giúp 
         bảo mật các hàm chạy ngầm bên trong và giữ cho code gọn gàng.
"""
__all__ = [
    'RoutingEngine',
    'findMultiStopRoute',
    'findConstrainedPath',
    'calculatePathMetrics',
    'loadJsonFile',
    'buildDirectedGraph'
]