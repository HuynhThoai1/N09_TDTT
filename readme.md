# 🗺️ Đồ án: Du Lịch Thông Minh (N09_TDTT)

Đây là kho lưu trữ mã nguồn chính của hệ thống Du lịch thông minh, bao gồm Giao diện người dùng (Frontend), Máy chủ xử lý (Backend), Hệ thống Trí tuệ nhân tạo (AI Engine) và Cơ sở dữ liệu.

## 📂 Cấu trúc thư mục dự án

```text
N09_TDTT/
│
├── ai_engine/             # Nơi chứa model Machine Learning và thuật toán tìm đường
│   └── venv/              # Môi trường ảo Python (KHÔNG đẩy lên Git)
│
├── backend/               # Máy chủ xử lý logic nghiệp vụ (Django)
│   ├── core/              # Cấu hình trung tâm (settings.py, định tuyến API)
│   ├── venv/              # Môi trường ảo Python (KHÔNG đẩy lên Git)
│   ├── db.sqlite3         # Database mặc định để test
│   └── manage.py          # Công cụ quản trị Backend
│
├── database/              # Lưu bản thiết kế ERD, script SQL và mock data
│
├── frontend/              # Giao diện người dùng (ReactJS + Vite)
│   ├── src/               # Code chính: Components, Pages, gọi API
│   ├── public/            # Tài nguyên tĩnh (hình ảnh, icon)
│   ├── node_modules/      # Thư viện JavaScript (KHÔNG đẩy lên Git)
│   └── package.json       # Khai báo cấu hình frontend
│
└── readme.md              # Tài liệu hướng dẫn cài đặt dự án