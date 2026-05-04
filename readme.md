# 🗺️ AI Itinerary Planner - Hệ thống Lên kế hoạch Hành trình Thông minh

[![Django](https://img.shields.io/badge/Backend-Django_6.0-green?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-blue?logo=react)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Infrastructure-Docker-blue?logo=docker)](https://www.docker.com/)
[![Goong Maps](https://img.shields.io/badge/Map_SDK-Goong_Maps-orange?logo=google-maps)](https://goong.io/)
[![AI-CLIP](https://img.shields.io/badge/AI-CLIP_ViT--B--32-orange?logo=pytorch)](https://openai.com/blog/clip/)

Hệ thống ứng dụng **Goong Maps SDK chính chủ** kết hợp với trí tuệ nhân tạo để tự động hóa việc lên kế hoạch hành trình du lịch dựa trên **ý định người dùng (Intent-driven)** và tối ưu hóa bằng **Giải thuật Di truyền (Genetic Algorithm)**.

---

## 📂 Cấu trúc dự án

```text
N09_TDTT/
├── ai_engine/          # Thuật toán tối ưu & Routing core
├── backend/            # Django REST Framework (Business Logic)
│   ├── api/            # API Endpoints & Semantic Search
│   ├── data/           # Seed data (JSON vector files)
│   └── media/          # Ảnh địa điểm (Local GIS Storage)
├── frontend/           # React + Vite (UI/UX)
├── docs/               # Tài liệu dự án & Sơ đồ ERD
├── scripts/            # Công cụ hỗ trợ (Crawl ảnh, xử lý dữ liệu)
└── docker-compose.yml  # Hạ tầng PostgreSQL (pgvector)
```

---

## 🛠️ Bước 1: Cấu hình API Key (Bắt buộc trước khi chạy)

Dự án sử dụng hệ sinh thái Goong Maps. Bạn cần chuẩn bị các Key sau:

1.  **Backend:** Copy file `backend/.env.example` thành `backend/.env` và điền `GOONG_API_KEY` (Key này dùng để tính toán lộ trình).
2.  **Frontend:** Copy file `frontend/.env.example` thành `frontend/.env` và điền `VITE_GOONG_MAPTILES_KEY` (Key này dùng để hiển thị nền bản đồ).
3.  **Docker:** Tại thư mục gốc, copy `.env.example` thành `.env` để cấu hình cổng Database.

> [!TIP]
> Nếu bạn bị lỗi xung đột cổng 5432 trên Windows, hãy sửa `DB_PORT=5433` trong các file `.env` trước khi khởi động Docker.

---

## ⚡ Bước 2: Khởi chạy dự án (Quick Setup)

### 1. Hạ tầng (Docker)
*Chạy tại thư mục gốc:*
```bash
docker compose up -d
```

### 2. Backend (Dành cho Bash/Git Bash)

**A. Cài đặt ban đầu (Chỉ chạy 1 lần duy nhất khi mới clone hoặc có data mới):**
```bash
cd backend

source ./venv/Scripts/activate

pip install -r requirements.txt

python manage.py migrate

python manage.py import_pois --clear data/district1_full_data.json

python manage.py runserver
```

### 3. Frontend
*Chạy tại thư mục gốc:*
```bash
cd frontend 

npm install 

npm run dev
```

---

## 📦 Dữ liệu nặng (OSRM & Media)

Do các file bản đồ và ảnh rất nặng, hãy tải từ [Drive nội bộ](https://drive.google.com/drive/folders/1Tr-oR9hALMCJf4J4a1lRFun6iiOCzWXv) và giải nén:
- `osrm_data/` -> Giải nén vào thư mục gốc dự án.
- `media/` -> Giải nén vào trong thư mục `backend/`.

---

## 💡 Lưu ý quan trọng
- **File `.env`**: Tuyệt đối không xóa trong `.gitignore`. File này chứa `GOONG_API_KEY` và cấu hình DB riêng cho từng người, không push key cá nhân lên GitHub.
- **Goong API Key**: Mỗi thành viên tự đăng ký tài khoản tại [Goong.io](https://goong.io/) và lấy **REST API Key** rồi điền vào file `.env` của mình.
- **CLIP Model**: Ở lần đầu chạy tìm kiếm, hệ thống sẽ tải model từ HuggingFace (~600MB). Hãy đảm bảo mạng ổn định.

---
*Dự án được phát triển bởi N09 - Nhóm Tư duy tính toán.*
