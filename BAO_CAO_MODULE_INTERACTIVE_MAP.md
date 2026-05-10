**BÁO CÁO MODULE: TƯƠNG TÁC VÀ TỐI ƯU LỘ TRÌNH (Route Interaction & Optimization)**


1. Mục tiêu
- Cung cấp giao diện cho phép người dùng tương tác trực tiếp với lộ trình do hệ thống gợi ý: thêm, xóa, kéo-thả thay đổi thứ tự; đồng thời cho phép tối ưu tự động toàn bộ lộ trình (giữ cố định điểm đầu/cuối).

2. Tính năng chính đã triển khai
- Kéo-thả thay đổi thứ tự các điểm dừng (khóa điểm đầu và điểm cuối).
- Thêm địa điểm bằng ô tìm kiếm (autocomplete Goong API) và chèn vào lộ trình.
- Xóa địa điểm (không xóa được điểm đầu/cuối).
- Tự động recalculation/polyline khi thay đổi (add/remove/reorder) — gọi backend tại `/api/smart-itinerary/`.
- Nút "Tối ưu lộ trình" để yêu cầu backend tối ưu thứ tự các điểm giữa (giữ cố định đầu/cuối).
- Nút "Định vị" và "Xem chi tiết" cho mỗi waypoint trong panel phải; "Xem chi tiết" mở tab Chi tiết ở Sidebar trái.
- Loading state khi đang tính toán lại đường đi; thông báo success/error cho các thao tác add/remove/reorder/optimize.
- Sửa lỗi marker jitter khi hover (tách inner element để scale, không ghi đè transform của map).

3. Files chính thay đổi
- `frontend/src/components/Map/MapView.jsx`
  - Thêm UI panel phải: tìm kiếm, danh sách waypoint, actions (locate, detail, delete), loading banner, action notices.
  - Tối ưu hiển thị marker hover, anchor center.
  - Prop mới: `onDetailLocationChange`, `isRecalculatingRoute`, `onOptimizeRoute`.

- `frontend/src/pages/MainPage.jsx`
  - Thêm state `isRecalculatingRoute`, `handleReorderWaypoints` trả về boolean success/fail.
  - Thêm `handleOptimizeRoute` để gọi `/api/smart-itinerary/` với `fix_endpoints: true`, map kết quả sao cho **giữ cố định điểm đầu/cuối** và áp dụng thứ tự API cho các điểm giữa.

- `frontend/src/components/Sidebar.jsx`
  - Tự động mở tab `detail` khi nhận `detailLocation` từ `MapView`.

4. API / Backend tương tác
- Gọi endpoint: `POST /api/smart-itinerary/` với payload { stops: [{id,name,latitude,longitude}, ...], prompt_text, fix_endpoints }.
- Backend trả về routes[0].waypoints và routes[0].polyline (nếu có). Module sẽ map waypoints trả về về các object waypoint gốc (giữ metadata) trước khi cập nhật state.

5. UX & Kiểm thử
- Luồng kiểm thử chính:
  1. Chọn route gợi ý → mở panel phải.
  2. Thêm điểm bằng search → kiểm tra marker, polyline mới, notice success/error.
  3. Kéo-thả điểm (không di chuyển điểm đầu/cuối) → kiểm tra polyline update.
  4. Xóa điểm (middle) → kiểm tra polyline update.
  5. Bấm "Tối ưu lộ trình" → kiểm tra thứ tự điểm giữa thay đổi hợp lý, polyline update.
  6. Bấm "Định vị" → map `flyTo` và mở popup marker.
  7. Bấm "Xem chi tiết" → Sidebar trái tự mở tab `detail` với thông tin.

6. Giới hạn và lưu ý
- Hiệu quả tối ưu phụ thuộc vào khả năng của backend (nếu backend không hỗ trợ `fix_endpoints`, thứ tự endpoints có thể thay đổi).
- Kết nối mạng chậm có thể dẫn tới trải nghiệm chờ lâu; đã thêm loading state nhưng có thể cần spinner toàn trang hoặc queued requests.
- Mapping waypoint giữa client/API dựa trên `id` hoặc tọa độ; nếu API trả về format khác cần điều chỉnh mapping.


