# 💻 Frontend - Du Lịch Thông Minh (N09_TDTT)

Chào mừng các thành viên nhóm 09 đến với phần giao diện của đồ án. Chúng ta sử dụng **ReactJS** kết hợp với **Vite** để đạt hiệu năng tối ưu nhất.

---

## 📂 Cấu trúc thư mục (Folder Structure)

Để đảm bảo code không bị chồng chéo, mọi người vui lòng tuân thủ cấu trúc thư mục `src/` đã được thiết lập sẵn:

```text
src/
├── assets/             # Hình ảnh, icons, logo (dùng import trực tiếp vào code).
├── components/         # Các thành phần giao diện có thể tái sử dụng.
│   ├── common/         # Button, Input, Modal, Card... (nhỏ, dùng nhiều nơi).
│   └── layout/         # Navbar, Footer, Sidebar... (khung cố định của web).
├── hooks/              # Các Custom Hooks để xử lý logic React riêng biệt.
├── pages/              # Giao diện các trang chính (Home, Map, Login, Dashboard...).
├── services/           # Chứa các file gọi API (Axios/Fetch) kết nối với Django Backend.
├── utils/              # Các hàm bổ trợ (Format tiền tệ, xử lý chuỗi, tính toán...).
├── App.jsx             # Component gốc - Nơi cấu hình Routes (điều hướng trang).
├── main.jsx            # File khởi tạo - Điểm bắt đầu của ứng dụng.
└── index.css           # CSS dùng chung toàn hệ thống.