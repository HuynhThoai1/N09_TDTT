# BÁO CÁO TIẾN ĐỘ THỰC HIỆN MODULE PROFILE

## Dự án: Hệ thống gợi ý lộ trình thông minh (N09_TDTT)
**Người thực hiện:** Phạm Văn Hữu Tài (24120435)

---

## 1. Công việc đã hoàn thành

### Phát triển Module Profile (Full-stack)
* **Xây dựng giao diện Sidebar:** Tích hợp menu quản lý thông tin cá nhân trực quan.
* **Triển khai ProfileModal:** Cho phép người dùng xem, cập nhật thông tin cá nhân và thay đổi ảnh đại diện.
* **Tích hợp Firebase Authentication:** Hệ thống hóa quy trình đăng nhập, đăng xuất và đảm bảo tính bảo mật cho dữ liệu người dùng.
* **Tính năng User Vibes:** Lưu trữ và đồng bộ hóa sở thích cá nhân, làm cơ sở dữ liệu đầu vào giúp AI gợi ý lộ trình tối ưu theo nhu cầu riêng biệt.

### Kỹ thuật & Git
* **Xử lý Merge Conflict:** Giải quyết thành công các xung đột mã nguồn khi đồng bộ nhánh cá nhân (`develop_HTai`) với nhánh chính (`main`).
* **Cấu hình bảo mật:** Thiết lập `.gitignore` để ẩn các thông tin nhạy cảm như `serviceAccountKey.json` và các biến môi trường trong file `.env`.

---

## 2. Các thay đổi về mã nguồn (Dành cho đồng đội)

### Backend (Django)
* **Thư viện mới:** Cập nhật `firebase-admin`, `PyJWT`, `python-dotenv`.
* **requirements.txt:** Đã được tối ưu hóa để đảm bảo tính đồng bộ môi trường phát triển.
* **API Endpoints:** Bổ sung API xử lý Profile và Vibes tại đường dẫn `/api/profile/`.

### Frontend (ReactJS)
* **Dependencies:** Cài đặt các gói hỗ trợ gồm `firebase`, `lucide-react`, `react-router-dom`, `clsx`, `tailwind-merge`.
* **Environment:** Cấu hình biến môi trường Firebase trong file `.env`.
* **Sidebar.jsx:** Hợp nhất thành công tính năng Profile cá nhân với tính năng AI Clarification của nhóm.

---

## 3. Hướng dẫn cài đặt sau khi Pull Code

Để hệ thống hoạt động ổn định sau khi gộp nhánh `develop_HTai`, vui lòng thực hiện các bước sau:

1.  **Cài đặt Backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

2.  **Cài đặt Frontend:**
    ```bash
    cd frontend
    npm install
    ```

3.  **Cấu hình bảo mật:**
    * Sao chép file `serviceAccountKey.json` vào thư mục gốc của **backend** để kích hoạt quyền Admin Firebase.
    * Cập nhật các biến môi trường Firebase vào file `.env` tại thư mục **frontend**.

---

## 4. Kế hoạch tiếp theo
* Kiểm thử (Testing) tính chính xác của dữ liệu Vibes khi tích hợp với phản hồi từ AI.
* Hỗ trợ nhóm trưởng thực hiện Merge Request vào nhánh `main` sau khi hoàn tất kiểm tra.
