# 🗺️ AI Itinerary Planner - Hệ thống Lên kế hoạch Hành trình Thông minh

[![Django](https://img.shields.io/badge/Backend-Django_6.0-green?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-blue?logo=react)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Infrastructure-Docker-blue?logo=docker)](https://www.docker.com/)
[![AI-CLIP](https://img.shields.io/badge/AI-CLIP_ViT--B--32-orange?logo=pytorch)](https://openai.com/blog/clip/)

Hệ thống ứng dụng trí tuệ nhân tạo để tự động hóa việc lên kế hoạch hành trình du lịch dựa trên **ý định người dùng (Intent-driven)** và tối ưu hóa bằng **Giải thuật Di truyền (Genetic Algorithm)**.

---

## 📂 Cấu trúc dự án (Refined)

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
├── osrm_data/          # Bản đồ offline cho Engine định tuyến
└── docker-compose.yml  # Hạ tầng PostgreSQL (pgvector) & OSRM
```

---

## ⚡ Cài đặt nhanh (Quick Setup)

Dành cho các thành viên muốn khởi chạy dự án ngay lập tức. Hãy copy và dán toàn bộ các khối lệnh bên dưới vào Terminal.

### 1. Chuẩn bị Hạ tầng (Docker & Env)
*Chạy tại thư mục gốc:*
```bash
# Tạo file cấu hình từ mẫu và khởi động Docker
cp .env.example .env && docker compose up -d
```

### 2. Khởi tạo Backend (Dành cho Bash/Git Bash)
*Mở một Terminal mới và chạy:*
```bash
cd backend && \
source ./venv/Scripts/activate && \
pip install -r requirements.txt && \
python manage.py migrate && \
python manage.py import_pois --clear data/district1_full_data.json && \
python manage.py runserver
```

### 3. Khởi tạo Frontend
*Mở một Terminal khác và chạy:*
```bash
cd frontend && npm install && npm run dev
```

---

## 🛠️ Cấu hình chi tiết (Hướng dẫn từng bước)

### 🔑 Bước 1: Quản lý biến môi trường (.env)
Dự án sử dụng cơ chế `.env` để tránh xung đột cổng. 
- Tìm file `.env` ở thư mục gốc.
- Nếu bạn bị lỗi `FATAL: password authentication failed`, hãy đổi `DB_PORT=5433` trong file `.env` và restart Docker.

### 🗺️ Bước 2: Dữ liệu nặng (OSRM & Media)
Do các file bản đồ rất nặng, hãy tải từ [Drive nội bộ](https://drive.google.com/drive/folders/1Tr-oR9hALMCJf4J4a1lRFun6iiOCzWXv) và giải nén đúng vị trí:
- `osrm_data/` -> Giải nén vào thư mục gốc.
- `media/` -> Giải nén vào trong `backend/`.

### 🗄️ Bước 3: Cơ sở dữ liệu & AI Search
Dữ liệu địa điểm được tích hợp sẵn vector 512 chiều để thực hiện tìm kiếm ngữ nghĩa.
- **Import lệnh:** `python manage.py import_pois --clear data/district1_full_data.json`

---

## 📸 Hình ảnh & Kiến trúc

### Sơ đồ Cơ sở dữ liệu (ERD)
Hệ thống sử dụng **PostgreSQL với extension `pgvector`** để thực hiện truy vấn vector cực nhanh từ model CLIP.

![ERD](./docs/assets/ERD.png)

---

## 💡 Lưu ý quan trọng cho Team
- **File `.env`**: Tuyệt đối không xóa trong `.gitignore`. File này giúp mỗi người có một cấu hình cổng DB (5432 hoặc 5433) riêng mà không làm hỏng code của nhau.
- **CLIP Model**: Ở lần đầu chạy tìm kiếm, hệ thống sẽ tải model từ HuggingFace (~600MB). Hãy đảm bảo mạng ổn định.

---
*Dự án được phát triển bởi N09 - Nhóm Tư duy tính toán.*
