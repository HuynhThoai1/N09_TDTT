# Báo cáo module: Chia sẻ lộ trình

## 1. Mục tiêu
Module "Chia sẻ lộ trình" cho phép đóng gói một lộ trình đã tạo thành đường dẫn công khai, để người khác mở xem ở chế độ chỉ đọc.

Giá trị mang lại:
- Người dùng chia sẻ nhanh qua liên kết.
- Người nhận xem được lộ trình, các điểm dừng và thông tin mô tả.
- Tăng khả năng lan tỏa hành trình trên mạng xã hội.

## 2. Phạm vi chức năng
Module hiện bao gồm:
- Tạo liên kết chia sẻ cho lộ trình được chọn.
- Sinh `share_id` duy nhất cho mỗi lộ trình.
- Lưu `route_data` trên backend dưới dạng JSON.
- Trang xem công khai theo đường dẫn `share/:shareId`.
- Hiển thị bản đồ, danh sách điểm dừng, mô tả, lượt xem và trạng thái (Fresh/Trending).
- Nút sao chép đường liên kết lên clipboard trên UI.
- Cập nhật metadata (OG/Twitter) để tối ưu hiển thị khi chia sẻ.

Không bao gồm:
- Chỉnh sửa lộ trình trên trang công khai.
- Quản lý phân quyền người dùng theo tài khoản.

## 3. Kiến trúc tổng quan
Frontend (React + Vite):
- `Sidebar` gửi yêu cầu tạo liên kết chia sẻ.
- `SharedRoutePage` đọc dữ liệu lộ trình từ backend theo `shareId`.
- Hiển thị bản đồ và thông tin ở chế độ chỉ đọc.

Backend (Django + DRF):
- API tạo `SharedRoute` (POST).
- API lấy `SharedRoute` theo `share_id` (GET).
- Tăng `view_count` khi trang được truy cập.
- Lưu `route_data` dưới dạng JSON trong bảng `shared_routes`.

## 4. Thiết kế dữ liệu
Model `SharedRoute` gồm các trường chính:
- `share_id`: ID công khai duy nhất.
- `route_data`: JSON chứa thông tin lộ trình, điểm dừng, prompt (nếu có).
- `created_at`: thời điểm tạo liên kết.
- `view_count`: số lượt xem trang chia sẻ.
- `creator_ip`: (tùy chọn) IP của người tạo, phục vụ thống kê.

## 5. API
1) Tạo liên kết chia sẻ
- Endpoint: `POST /api/shared-routes/`
- Input: `route`, `stops`, `prompt_text`, `created_from` (ví dụ)
- Output: `share_id`, `share_url`, `route_data`, `created_at`

2) Lấy dữ liệu lộ trình chia sẻ
- Endpoint: `GET /api/shared-routes/<share_id>/`
- Output: `share_id`, `share_url`, `route_data`, `created_at`, `view_count`
- Hành vi bổ sung: mỗi lần GET hợp lệ sẽ làm tăng `view_count`.

## 6. Luồng xử lý nghiệp vụ
1. Người dùng chọn lộ trình trong `Sidebar`.
2. Frontend gọi `POST` để tạo `SharedRoute`.
3. Backend sinh `share_id` và lưu `route_data`.
4. Frontend hiển thị đường dẫn chia sẻ và cung cấp nút sao chép.
5. Người nhận mở `share/:shareId`.
6. `SharedRoutePage` gọi `GET` lấy dữ liệu lộ trình.
7. Backend trả dữ liệu và cập nhật `view_count`.
8. Frontend hiển thị lộ trình ở chế độ chỉ đọc.

## 7. Giao diện (UI/UX)
Thành phần hiển thị chính:
- Tiêu đề lộ trình và mô tả ngắn.
- Badge Fresh/Trending dựa trên `view_count`.
- Thông tin tổng quan: số điểm dừng, lượt xem (chỉ đọc).
- Hộp chia sẻ kèm nút `Copy`.
- Bản đồ lộ trình và danh sách điểm dừng theo thứ tự.
- Mô tả "vibe" của chuyến đi (nếu có).

Ghi chú:
- Hỗ trợ hiển thị QR code khi cần.

## 8. Kiểm thử và kết quả
Đã kiểm thử các trường hợp chính:
- Tạo liên kết thành công cho lộ trình hợp lệ.
- Mở liên kết chia sẻ hiển thị đúng dữ liệu.
- Liên kết không tồn tại trả về thông báo lỗi thân thiện.
- Nút sao chép hoạt động trên trình duyệt hỗ trợ clipboard API.
- Frontend build thành công sau cập nhật module.

Kết luận kiểm thử:
- Module hoạt động đúng theo yêu cầu chia sẻ lộ trình ở chế độ chỉ đọc.

## 9. Kết luận
Module "Chia sẻ lộ trình" đã đạt mục tiêu chính: chuyển lộ trình thành nội dung có thể chia sẻ, mở xem và theo dõi dễ dàng.
