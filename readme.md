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
├── ai_engine/              # Thuật toán tối ưu & Routing core
│   ├── __init__.py         # Khởi tạo module AI Engine
│   ├── RoutingEngine.py    # Engine tính toán tuyến đường
│   ├── algorithms.py       # Các thuật toán tối ưu (Nearest Neighbor, 2-opt)
│   └── utils.py            # Hàm tiện ích (Haversine, ma trận khoảng cách)
│
├── backend/                # Django REST Framework (Business Logic)
│   ├── api/                # ⭐ App chính — API Endpoints & AI Services
│   │   ├── models.py       # Database models (POI, SharedRoute, VibeTag, UserProfile)
│   │   ├── views.py        # API endpoints (smart-itinerary, search, share, vibes)
│   │   ├── ai_services.py  # Tích hợp SBERT, CLIP, Gemini AI
│   │   ├── semantic_search.py   # Dual-Vector search (SBERT 60% + CLIP 40%)
│   │   ├── itinerary_optimizer.py  # Genetic Algorithm + Goong routing
│   │   ├── goong_service.py # Goong Maps API wrapper
│   │   ├── serializers.py  # DRF serializers
│   │   └── management/commands/   # CLI tools (import_pois, import_vibes, reindex...)
│   ├── core/               # Django project settings & URL routing
│   ├── data/               # Seed data (JSON: POIs, Vibe Tags)
│   ├── tours/              # App quản lý tour
│   ├── users/              # App xác thực người dùng (Firebase Auth)
│   └── requirements.txt    # Dependencies Backend
│
├── frontend/               # React 18 + Vite (UI/UX)
│   └── src/
│       ├── components/     # UI Components (Sidebar, MapView, ProfileModal...)
│       ├── pages/          # Pages (Main, Login, Register, Onboarding, SharedRoute)
│       ├── lib/            # API utilities (vibeApi.js)
│       ├── data/           # Static data (locations.js)
│       └── firebase.js     # Firebase client config
│
├── scripts/                # Công cụ hỗ trợ offline
│   ├── caodata.ipynb       # Notebook cào dữ liệu từ OpenStreetMap (Colab)
│   ├── crawl_poi_images.py # Script tải ảnh địa điểm từ Bing
│   └── generate_vectors.py # Script sinh CLIP vector offline
│
├── docs/                   # Tài liệu dự án
│   └── assets/ERD.png      # Sơ đồ Entity-Relationship
│
└── docker-compose.yml      # Hạ tầng PostgreSQL + pgvector
```

---

## 🛠️ Bước 1: Cấu hình API Key (Bắt buộc trước khi chạy)

Dự án sử dụng hệ sinh thái Goong Maps và Google Gemini AI. Bạn cần chuẩn bị các Key sau:

### Goong Maps (Bắt buộc — dùng để hiển thị bản đồ & tính toán lộ trình)

1.  Đăng ký tài khoản tại [account.goong.io](https://account.goong.io/).
2.  Tạo 2 loại Key:
    - **REST API Key**: Điền vào `backend/.env` ở dòng `GOONG_API_KEY=...`
    - **Maptiles Key**: Điền vào `frontend/.env` ở dòng `VITE_GOONG_MAPTILES_KEY=...`

3. Để tính năng Đăng nhập và Profile hoạt động, cần cấu hình các file bảo mật
    - **Backend**: Copy file `serviceAccountKey.json` vào thư mục `backend/.`
    - **Frontend**: Cập nhật các biến sau vào file `frontend/.env`:
```bash
VITE_FIREBASE_API_KEY=...
```

> [!NOTE]
> Lấy file serviceAccountKey.json và key firebase ở drive

### Google Gemini AI (Tùy chọn — dùng để AI chấm điểm lộ trình)

1.  Truy cập [Google AI Studio](https://aistudio.google.com/).
2.  Tạo một **Project mới** và lấy **API Key**.
3.  Điền vào `backend/.env` ở dòng `GEMINI_API_KEY=...`

> [!NOTE]
> Gemini API là **tùy chọn**. Nếu không cấu hình hoặc API bị lỗi, hệ thống vẫn hoạt động bình thường — chỉ bỏ qua bước chấm điểm AI (Vòng 2) và dùng thuật toán local thay thế.

> [!TIP]
> Nếu bạn bị lỗi xung đột cổng 5432 trên Windows, hãy sửa `DB_PORT=5433` trong file `.env` của Docker trước khi khởi động.

---

## ⚡ Bước 2: Khởi chạy dự án (Quick Setup)

### 1. Hạ tầng (Docker)
*Chạy tại thư mục gốc:*
```bash
docker compose up -d
```

### 2. Backend (Dành cho Bash/Git Bash)

**A. Thiết lập & Cập nhật dữ liệu (Chạy khi mới clone hoặc có tính năng mới):**
```bash
cd backend && \
source ./venv/Scripts/activate && \
pip install -r requirements.txt && \
python manage.py makemigrations && \
python manage.py migrate && \
python manage.py import_pois --clear data/district1_full_data.json && \
python manage.py import_vibes && \
python manage.py runserver
```

**B. Khởi động Server hàng ngày:**
```bash
cd backend && source ./venv/Scripts/activate && python manage.py runserver
```

### 3. Frontend
*Chạy tại thư mục gốc:*
```bash
cd frontend && npm install && npm run dev
```

---

## 📦 Dữ liệu nặng (Media)

Do các file ảnh địa điểm rất nặng, hãy tải từ [Drive nội bộ](https://drive.google.com/drive/folders/1Tr-oR9hALMCJf4J4a1lRFun6iiOCzWXv) và giải nén:
- `media/` -> Giải nén vào trong thư mục `backend/`.

---

## 💡 Lưu ý quan trọng
- **File `.env`**: Tuyệt đối không xóa trong `.gitignore`. File này chứa `GOONG_API_KEY` và cấu hình DB riêng cho từng người, không push key cá nhân lên GitHub.
- **Goong API Key**: Mỗi thành viên tự đăng ký tài khoản tại [Goong.io](https://goong.io/) và lấy **REST API Key** rồi điền vào file `.env` của mình.
- **Gemini API Key**: Lấy tại [Google AI Studio](https://aistudio.google.com/). Nếu gặp lỗi 429 (hết quota), hãy đợi qua ngày hoặc tạo Project mới để lấy Key mới. Hệ thống vẫn chạy bình thường khi không có Key.
- **CLIP Model**: Ở lần đầu chạy tìm kiếm, hệ thống sẽ tải model từ HuggingFace (~600MB). Hãy đảm bảo mạng ổn định.
- **Lỗi thư viện**: Nếu gặp lỗi firebase-admin, hãy đảm bảo bạn đã chạy `pip install -r requirements.txt` bản mới nhất.

---

*Dự án được phát triển bởi N09 - Nhóm Tư duy tính toán.*
