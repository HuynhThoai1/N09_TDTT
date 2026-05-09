# Báo cáo thay đổi - Conversational AI Interface

Báo cáo chi tiết về việc tái cấu trúc giao diện và tối ưu hóa luồng hỏi đáp AI trong Sidebar.

### 1. Các file đã chỉnh sửa
- [Sidebar.jsx](frontend/src/components/Sidebar.jsx): 
  - Sửa lỗi thanh cuộn (scrolling): Xóa `overflow-y-auto` ở thẻ bao ngoài cùng để tránh cuộn toàn bộ sidebar (bao gồm cả header tab).
  - Tối ưu hóa UI hiển thị câu hỏi AI: Chuyển cấu trúc lưới 2 cột (`grid-cols-2`) thành cấu trúc xếp dọc từng hàng (`flex-col`) đơn giản và dễ đọc hơn.
  - Cập nhật class CSS hiển thị thanh cuộn bằng `custom-scrollbar`.
- [index.css](frontend/src/index.css): Thêm CSS tùy chỉnh cho `custom-scrollbar` (chiều rộng 6px, màu thumb trong suốt phù hợp với dark theme).
- [AIClarification.jsx](frontend/src/components/AIClarification.jsx) **(Mới)**: Component riêng biệt chứa toàn bộ giao diện và logic khảo sát AI (nếu được tách từ Sidebar).

### 2. Chi tiết Giao diện (Look & Feel)
Giao diện mới được xây dựng theo phong cách tối giản, đồng bộ hoàn toàn với hệ thống Dark Mode của ứng dụng:
- **Tối ưu hiển thị thanh cuộn (Scrollbar)**: 
  - Khắc phục triệt để tình trạng mất thanh cuộn hoặc cuộn tràn khung. 
  - Thanh cuộn tùy chỉnh mới (`custom-scrollbar`) tinh tế, thanh mảnh, đồng bộ hoàn toàn với tông màu tối cao cấp (premium aesthetic) của ứng dụng mà không gây rối mắt.
  - Header các tab (Lên kế hoạch, Chi tiết, Kết quả) luôn được cố định ở trên cùng, chỉ cuộn nội dung phía dưới.
- **Thiết kế câu trả lời AI tối giản**: 
  - Sắp xếp các lựa chọn câu trả lời (A, B, C, D) theo hàng dọc chiếm toàn bộ chiều rộng.
  - Background của các lựa chọn chưa được chọn sử dụng màu đen (`bg-slate-900`) và viền `border-slate-800`, hoàn toàn đồng bộ với ô textarea nhập liệu bên trên, tạo cảm giác liền mạch và nguyên khối.
- **Phân cấp rõ ràng**: Phần AI hiện lên tự nhiên như một phần của danh sách nội dung, không có viền sáng gây xao nhãng.
- **Ô nhập liệu (Other)**: Chuyển sang dạng `textarea` linh hoạt, tự động xuống dòng khi nhập dài, cỡ chữ đồng nhất.

### 3. Cấu trúc Component & Build
- **Modularization**: Tách logic phức tạp ra khỏi Sidebar để dễ bảo trì. 
- **Scrolling Fix**: Đảm bảo các khung nội dung con `flex-1` tự handle scroll của nó thay vì scroll toàn bộ Component.
- **Dynamic Interaction**: Giao diện cập nhật state ngay lập tức khi người dùng thao tác.

> **Kết quả**: Giao diện tab "Lên kế hoạch" sạch sẽ hơn, các câu trả lời AI rõ ràng, trực quan, và trải nghiệm cuộn trang mượt mà, tinh tế hơn.
