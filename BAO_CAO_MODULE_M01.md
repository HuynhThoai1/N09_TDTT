# BÁO CÁO CHI TIẾT QUÁ TRÌNH PHÁT TRIỂN MODULE PROFILE
**Người thực hiện:** Phạm Văn Hữu Tài  
**Thời gian thực hiện:** 10/05/2026 - Nay  
**Dự án:** n09_tdtt (Routing Engine & Management System)

---

## 1. TỔNG QUAN CÔNG VIỆC
Kể từ ngày 10/05, tôi đã chịu trách nhiệm phát triển trọn vẹn tính năng **Quản lý hồ sơ cá nhân (Profile Module)**. Đây là một tính năng Full-stack đòi hỏi sự phối hợp chặt chẽ giữa giao diện người dùng, hệ thống xác thực Firebase và cơ sở dữ liệu SQL Server thông qua Django.

---

## 2. CHI TIẾT CÁC THAY ĐỔI THEO TỪNG THÀNH PHẦN

### A. FRONTEND (ReactJS)

#### 📄 Tạo mới: `frontend/src/components/ProfileModal.jsx`
* **Giao diện:** Thiết kế Modal đa năng sử dụng Tailwind CSS, hỗ trợ hiển thị thông tin và tương tác người dùng.
* **Logic xử lý:** * Sử dụng `useEffect` để tự động gọi API lấy dữ liệu ngay khi mở Modal.
    * Tích hợp Firebase Authentication để xử lý Token xác thực.
    * Viết hàm `handleSave` để đồng bộ dữ liệu SĐT và Ngày sinh xuống Backend.
    * Tích hợp logic đổi mật khẩu an toàn với tính năng `re-authenticate` của Firebase.

#### 📄 Chỉnh sửa: `frontend/src/components/Sidebar.jsx`
* **Mục đích:** Tạo điểm chạm để người dùng truy cập vào Profile.
* **Thay đổi:** * Khởi tạo State `isProfileOpen` để điều khiển đóng/mở Modal.
    * Gắn Component `ProfileModal` vào cấu trúc Sidebar.
    * Thêm sự kiện `onClick` vào mục "Hồ sơ" để kích hoạt Modal.

#### 📄 Chỉnh sửa: `frontend/src/pages/LoginPage.jsx`
* **Thay đổi:** * Cập nhật luồng xử lý sau khi đăng nhập thành công để đảm bảo ID Token được lưu trữ sẵn sàng cho các yêu cầu API sau đó.
    * Thêm lệnh gọi API khởi tạo bản ghi Profile tại Backend cho người dùng mới trong lần đầu đăng nhập.

---

### B. BACKEND (Django & SQL Server)

#### 📄 Chỉnh sửa: `backend/models.py`
* **Nội dung:** Mở rộng bảng dữ liệu người dùng của đồng đội.
* **Thay đổi:** * Thêm trường `phone = models.CharField(max_length=15, blank=True, null=True)`
    * Thêm trường `birth_date = models.DateField(null=True, blank=True)`
    * Thực hiện Migration để cập nhật cấu trúc Database SQL Server.

#### 📄 Chỉnh sửa: `backend/views.py`
* **Nội dung:** Viết logic xử lý API cho Profile.
* **Thay đổi:** * Tạo `ProfileView(APIView)` với phương thức `GET` để trả về dữ liệu cá nhân.
    * Tạo phương thức `POST` để tiếp nhận và lưu trữ thông tin từ Frontend gửi lên, sử dụng `get_or_create` để tránh trùng lặp dữ liệu.

#### 📄 Chỉnh sửa: `backend/urls.py`
* **Nội dung:** Cấu hình định tuyến.
* **Thay đổi:** Thêm `path('api/profile/', ProfileView.as_view())` vào danh sách urlpatterns để kết nối Frontend với Backend.

---

## 3. CÁC QUYẾT ĐỊNH KỸ THUẬT & TỐI ƯU HÓA
Trong quá trình triển khai, tôi đã thực hiện một số điều chỉnh quan trọng để tối ưu hệ thống:

1. **Loại bỏ Firebase Storage:** Do yêu cầu về chi phí của gói Google Blaze, tôi đã chủ động xóa bỏ tính năng lưu ảnh trên Cloud và các đoạn code `uploadBytes`, `getDownloadURL`. Điều này giúp hệ thống gọn nhẹ, tránh lỗi CORS và không tốn phí duy trì.
2. **Lưu trữ tập trung:** Chuyển toàn bộ việc quản lý thông tin hồ sơ về Django và SQL Server của nhóm thay vì phân tán dữ liệu ở các dịch vụ bên ngoài.
3. **Dọn dẹp mã nguồn:** Xóa bỏ các thư viện và file cấu hình dư thừa liên quan đến Firebase Storage để mã nguồn sạch sẽ, dễ bảo trì cho các thành viên khác trong nhóm.

---

## 4. KẾT QUẢ ĐẠT ĐƯỢC
* Module Profile hoạt động ổn định, đồng bộ hóa tốt với hệ thống Login hiện tại.
* Dữ liệu người dùng được bảo mật thông qua Token Firebase.
* Giao diện đồng nhất với bộ nhận diện của dự án n09_tdtt.