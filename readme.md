# 🗺️ Đồ án: Du Lịch Thông Minh (N09_TDTT)

Đây là kho lưu trữ mã nguồn chính của hệ thống Du lịch thông minh, bao gồm Giao diện người dùng (Frontend), Máy chủ xử lý (Backend), Hệ thống Trí tuệ nhân tạo (AI Engine) và Cơ sở dữ liệu.

## 📂 Cấu trúc thư mục dự án

```text
N09_TDTT/
├── .gitignore                  # Cấu hình các file/thư mục không đưa lên Git
├── readme.md                   # Tài liệu tổng quan và hướng dẫn dự án
├── ai_engine/                  # Thành phần AI: mô hình và thuật toán xử lý thông minh
│   └── (các module nội bộ)     # Tổ chức code AI theo chức năng
├── backend/                    # Máy chủ Django xử lý nghiệp vụ và cung cấp API
│   ├── manage.py               # Công cụ chạy server, migrate, tạo dữ liệu mẫu
│   ├── requirements.txt        # Danh sách thư viện Python cần cài
│   ├── db.sqlite3              # Cơ sở dữ liệu SQLite dùng cho môi trường test/dev
│   ├── api/                    # App API tổng hợp, đầu mối xử lý endpoint chung
│   ├── core/                   # Cấu hình trung tâm Django (settings, urls, wsgi, asgi)
│   ├── tours/                  # App quản lý tour, lịch trình, điểm đến
│   └── users/                  # App quản lý người dùng và xác thực
├── database/                   # Tài liệu dữ liệu: ERD, script SQL, mock data
│   └── (tài nguyên dữ liệu)    # Nơi lưu thiết kế và dữ liệu phục vụ phát triển
└── frontend/                   # Ứng dụng giao diện người dùng (ReactJS + Vite)
    ├── src/                    # Mã nguồn chính: pages, components, services, hooks
    ├── public/                 # Tài nguyên tĩnh: ảnh, icon, file public
    ├── package.json            # Cấu hình npm scripts và dependencies
    ├── vite.config.js          # Cấu hình Vite cho build/dev server
    ├── eslint.config.js        # Cấu hình kiểm tra chất lượng mã nguồn frontend
    ├── index.html              # File HTML gốc để mount ứng dụng React
    └── README.md               # Hướng dẫn riêng cho phần frontend
```