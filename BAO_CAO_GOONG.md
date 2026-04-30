# 📄 Báo cáo

Dự án đã hoàn thành giai đoạn nâng cấp quan trọng nhất: Chuyển đổi từ hệ thống bản đồ tĩnh sang **Hệ sinh thái Goong Maps chính chủ** kết hợp với **Trí tuệ nhân tạo (AI)** để mang lại trải nghiệm người dùng tối ưu nhất.

## 1. Công nghệ Bản đồ (Map SDK)
Thay vì sử dụng Leaflet và OpenStreetMap (độ chi tiết thấp ở Việt Nam), hệ thống hiện đã chuyển sang **Goong JS SDK**:
- **Bản đồ hiển thị (Vector Maps):** Sử dụng `@goongmaps/goong-js` cho phép hiển thị bản đồ mượt mà, hỗ trợ xoay, nghiêng và tải dữ liệu nhanh chóng.
- **Đa dạng chế độ (Style Switcher):** Hỗ trợ 3 chế độ hiển thị:
    - **Goong Map:** Chế độ mặc định, dữ liệu địa danh chính xác nhất cho Việt Nam.
    - **Vệ tinh (Satellite):** Hình ảnh thực tế từ vệ tinh (Esri).
    - **OpenStreetMap (OSM):** Chế độ dự phòng khi cần thiết.
- **Cấu hình Key:**
    - `MapTiles Key`: Sử dụng trong `MapView.jsx` để hiển thị nền bản đồ.
    - `REST API Key`: Sử dụng trong Backend để tính toán lộ trình.

## 2. Hệ thống Gợi ý Thông minh (AI Smart Itinerary)
Hệ thống không chỉ đơn thuần là nối các điểm, mà còn tự động "suy nghĩ" để đưa ra các gợi ý phù hợp nhất với ý định của người dùng.

### Quy trình xử lý (Pipeline):
1.  **Semantic Search (AI):** Khi người dùng nhập yêu cầu (ví dụ: *"đi ăn uống và tham quan lịch sử"*), hệ thống sử dụng model **CLIP (OpenAI)** để so sánh ý nghĩa câu chữ với 200+ địa điểm trong CSDL Quận 1.
2.  **Genetic Algorithm (Giải thuật Di truyền):** Hệ thống tính toán hàng ngàn phương án di chuyển khác nhau để chọn ra 3 lộ trình tốt nhất:
    - **Lộ trình Tinh túy:** Các địa điểm giống với mô tả nhất.
    - **Ẩm thực & Thư giãn:** Ưu tiên quán ăn, cafe, không gian chill.
    - **Khám phá & Trải nghiệm:** Ưu tiên bảo tàng, di tích, hoạt động vận động.
3.  **Goong Routing:** Sử dụng Goong Directions API để vẽ đường đi bám sát mặt đường thực tế và tính toán thời gian/khoảng cách chính xác.

## 3. Các cải tiến kỹ thuật quan trọng
- **Xử lý ngoại lệ (Fallback Logic):** Ngay cả khi API gặp sự cố hoặc không tính toán được ma trận khoảng cách, hệ thống vẫn đảm bảo trả về đủ 3 gợi ý lộ trình dựa trên độ tương đồng ngữ nghĩa.
- **Đồng bộ dữ liệu:** Backend chấp nhận cả địa điểm có sẵn trong DB nội bộ và địa điểm mới từ Goong Autocomplete (Global search), đảm bảo người dùng có thể bắt đầu từ bất cứ đâu.
- **Giao diện (UI/UX):**
    - Marker được đánh số thứ tự từ 1 đến N.
    - Bảng danh sách điểm dừng (Route Panel) bên phải tự động cập nhật theo lộ trình được chọn.
    - Hiệu ứng đường đi chuyển động (Flow animation) sinh động.

---

