<div align="center">

# AI Travel Itinerary Planner

### Hệ thống Du lịch Thông minh

*Tự động sinh lộ trình tối ưu dựa trên ý định người dùng, được cá nhân hóa theo sở thích — sử dụng Giải thuật Di truyền, Tìm kiếm Ngữ nghĩa Dual-Vector, và Gemini AI.*

[![Django](https://img.shields.io/badge/Django_6.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_+_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Goong Maps](https://img.shields.io/badge/Goong_Maps_SDK-FF6F00?style=for-the-badge&logo=google-maps&logoColor=white)](https://goong.io/)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![CLIP](https://img.shields.io/badge/CLIP_ViT--B--32-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://openai.com/research/clip)
[![SBERT](https://img.shields.io/badge/Vietnamese_SBERT-FF6F00?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/keepitreal/vietnamese-sbert)

</div>

---

## Mục lục

- [Tổng quan dự án](#-tổng-quan-dự-án)
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [AI Pipeline — Cách hệ thống hoạt động](#-ai-pipeline--cách-hệ-thống-hoạt-động)
- [Tech Stack chi tiết](#-tech-stack-chi-tiết)
- [Cấu trúc mã nguồn](#-cấu-trúc-mã-nguồn)
- [API Endpoints](#-api-endpoints)
- [Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [Thông tin nhóm](#-thông-tin-nhóm)

---

## Tổng quan dự án

**AI Travel Itinerary Planner** là một ứng dụng web fullstack giải quyết bài toán thực tế: *"Làm sao để lên một lịch trình du lịch tối ưu chỉ bằng một câu mô tả?"*

Thay vì phải tự nghiên cứu hàng chục địa điểm và sắp xếp thủ công, người dùng chỉ cần:
1. **Chọn điểm xuất phát** trên bản đồ
2. **Mô tả mong muốn** bằng ngôn ngữ tự nhiên (ví dụ: *"Muốn đi hẹn hò, uống cà phê view đẹp rồi ăn tối lãng mạn"*)
3. **Nhận 3 lộ trình tối ưu** — được AI tính toán, xếp hạng, và giải thích lý do gợi ý

Hệ thống xử lý toàn bộ pipeline: **hiểu ý định → tìm kiếm ngữ nghĩa → tối ưu hóa lộ trình → chấm điểm AI → sinh giải thích**.

> **Phạm vi dữ liệu hiện tại:** Quận 1, TP. Hồ Chí Minh — với hơn 150+ địa điểm (nhà hàng, quán cà phê, bảo tàng, điểm tham quan, ...) được thu thập và vector hóa.

---

## Tính năng nổi bật

### Trí tuệ Nhân tạo
| Tính năng | Mô tả |
|-----------|--------|
| **Tìm kiếm Ngữ nghĩa Dual-Vector** | Kết hợp CLIP (visual) + Vietnamese SBERT (text) với trọng số động theo ngôn ngữ đầu vào để tìm địa điểm phù hợp nhất |
| **Giải thuật Di truyền (GA)** | Tối ưu hóa thứ tự điểm dừng với các toán tử Selection, Crossover, Mutation — có ràng buộc cố định điểm đầu/cuối |
| **AI Gatekeeper (Hỏi ngược)** | Sử dụng Gemini AI phân tích prompt chưa đủ thông tin → sinh câu hỏi phỏng vấn người dùng trước khi xử lý |
| **AI Scoring 2 Vòng** | Vòng 1: Chấm điểm cục bộ (S_prompt + S_pref + S_time). Vòng 2: Gemini AI đánh giá logic tổng thể |
| **Explainable AI** | Tự động sinh câu giải thích bằng tiếng Việt cho mỗi lộ trình, giúp người dùng hiểu tại sao AI gợi ý |

### Bản đồ & Điều hướng
| Tính năng | Mô tả |
|-----------|--------|
| **Goong Maps SDK** | Bản đồ Việt Nam chính chủ — hiển thị polyline lộ trình, marker tương tác, popup thông tin |
| **Tính toán lộ trình thực tế** | Sử dụng Goong Distance Matrix + Directions API để có thời gian & khoảng cách di chuyển thực |
| **Autocomplete địa điểm** | Tích hợp Goong Place AutoComplete — tìm kiếm nhanh bất kỳ địa điểm nào trên bản đồ Việt Nam |

### Cá nhân hóa
| Tính năng | Mô tả |
|-----------|--------|
| **Hệ thống Vibe Tags** | Người dùng chọn sở thích (Không gian, Ẩm thực, Văn hóa, Hoạt động, Thời điểm) → AI ưu tiên trong kết quả |
| **Semantic Vibe Matching** | So khớp sở thích với địa điểm bằng cosine similarity (không phải keyword matching đơn giản) |
| **Firebase Authentication** | Đăng nhập/đăng ký an toàn, lưu profile và sở thích cá nhân |

### Chia sẻ & Tương tác
| Tính năng | Mô tả |
|-----------|--------|
| **Chia sẻ lộ trình** | Tạo link chia sẻ (share URL) cho lộ trình đã tạo — người nhận xem được trên bản đồ đầy đủ |
| **Kéo thả sắp xếp** | Người dùng có thể sắp xếp lại thứ tự waypoints bằng drag & drop, hệ thống tự recalculate polyline |
| **3 phương án so sánh** | Hiển thị 3 lộ trình (Gốc, Tối ưu thời gian, AI Gợi ý) cùng lúc để người dùng so sánh và chọn |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  React 19     │  │ Goong Maps   │  │  Firebase Auth Client    │  │
│  │  + Vite 8     │  │ JS SDK       │  │  (Login/Register)        │  │
│  └───────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└──────────┼─────────────────┼───────────────────────┼────────────────┘
           │ REST API        │ Map Tiles              │ ID Token
           ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Django 6.0 + DRF)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     API Layer (views.py)                    │    │
│  │  /smart-itinerary  /search  /vibes  /shared-routes  /profile│    │
│  └──────────┬──────────────┬──────────────┬────────────────────┘    │
│             │              │              │                         │
│  ┌──────────▼──────┐  ┌───▼───────────┐  ┌▼─────────────────────┐   │
│  │ Itinerary       │  │ Semantic      │  │ AI Services          │   │
│  │ Optimizer       │  │ Search        │  │                      │   │
│  │                 │  │               │  │ • SBERT Scoring      │   │
│  │ • Genetic Algo  │  │ • CLIP Model  │  │ • Gemini Scoring     │   │
│  │ • Greedy Insert │  │ • SBERT Model │  │ • Prompt Clarifier   │   │
│  │ • Fitness Func  │  │ • Dual-Vector │  │ • Explainable AI     │   │
│  └────────┬────────┘  └───────────────┘  └──────────────────────┘   │
│           │                                                         │
│  ┌────────▼────────────────────────────────────────────────────┐    │
│  │              Goong Service (goong_service.py)               │    │
│  │  Distance Matrix │ Directions │ Autocomplete │ Geocode      │    │
│  └─────────────────────────────┬───────────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
           ┌─────────────────────┼──────────────────────┐
           ▼                     ▼                      ▼
  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────┐
  │  PostgreSQL     │  │  Goong Maps     │  │  Google Gemini    │
  │  + pgvector     │  │  REST API       │  │  2.5 Flash        │
  │  (Docker)       │  │  (External)     │  │  (External)       │
  └─────────────────┘  └─────────────────┘  └───────────────────┘
```

---

## AI Pipeline — Cách hệ thống hoạt động

Khi người dùng gửi yêu cầu tạo lộ trình, hệ thống thực hiện pipeline 5 bước:

### Bước 1: AI Gatekeeper — Phân tích ý định
```
Input: "đi chơi" (prompt quá ngắn/mơ hồ)
  ↓
Gemini AI phân tích → is_sufficient: false
  ↓
Trả về câu hỏi phỏng vấn: "Bạn đi cùng ai?", "Thích ăn uống gì?", ...
  ↓
Người dùng trả lời → Prompt được làm giàu:
"đi chơi. Ngữ cảnh bổ sung: đi cùng người yêu, thích cà phê view đẹp"
```

### Bước 2: Tìm kiếm Ngữ nghĩa Dual-Vector
```
Prompt (đã làm giàu)
  ↓
┌──────────────────┐    ┌───────────────────────┐
│ CLIP ViT-B-32    │    │ Vietnamese SBERT      │
│ (Visual Vector)  │    │ (Text Vector)         │
└────────┬─────────┘    └───────────┬───────────┘
         │                         │
         ▼                         ▼
   Image Vectors              Text Vectors
   (512 dim)                  (768 dim)
         │                         │
         └──────────┬──────────────┘
                    ▼
         Cosine Similarity × Trọng số động
         (Tiếng Việt: Text 60% + Visual 40%)
         (English:    Text 20% + Visual 80%)
                    ↓
         Top-K địa điểm phù hợp nhất
```

### Bước 3: Tối ưu hóa bằng Giải thuật Di truyền (GA)
```
Input: Mandatory Stops + Bonus Candidates + Time Matrix (Goong API)
  ↓
GeneticOptimizer:
  • Population: 50 cá thể (chromosome = thứ tự điểm dừng)
  • Generations: 40 thế hệ tiến hóa
  • Fitness = (Semantic Score × 10) - Time Penalty + Diversity Bonus - Cluster Penalty
  • Elitism: Giữ top 20% cá thể tốt nhất
  • Crossover: Union-based trên phần giữa (giữ cố định điểm đầu/cuối)
  • Mutation: Random shuffle 10%
  ↓
Output: 10 ứng viên lộ trình → Chọn Top 3
```

### Bước 4: AI Scoring 2 Vòng
```
Vòng 1 — Chấm điểm cục bộ (Python):
  ┌───────────────────────────────────────────────────────┐
  │  S_prompt (50%): Cosine similarity                    │
  │  S_pref   (30%): Semantic Vibe Match                  │
  │  S_time   (20%): Travel time penalty                  │
  │  → score_v1 = 0.5×S_prompt + 0.3×S_pref + 0.2×S_time  │
  └───────────────────────────────────────────────────────┘

Vòng 2 — Chấm điểm tổng thể (Gemini AI):
  ┌────────────────────────────────────────┐
  │  Tiêu chí: Phù hợp ý định (1-10)       │
  │           Đa dạng trải nghiệm (1-10)   │
  │           Logic di chuyển (1-10)       │
  │  → final_score = 0.7×V1 + 0.3×V2       │
  └────────────────────────────────────────┘
```

### Bước 5: Sinh kết quả & Giải thích
```
Top 3 routes (đã xếp hạng) + AI Reason (Explainable AI) + Polyline (Goong Directions)
  ↓
Frontend: Hiển thị 3 lộ trình trên bản đồ với marker, polyline, và card so sánh
```

---

## Tech Stack chi tiết

### Backend
| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **Python** | 3.x | Ngôn ngữ chính |
| **Django** | 6.0 | Web framework |
| **Django REST Framework** | — | API layer |
| **PostgreSQL + pgvector** | Latest | Cơ sở dữ liệu + Vector storage |
| **sentence-transformers** | — | CLIP & SBERT model inference |
| **Google Generative AI** | Gemini 2.5 Flash | AI Scoring & Prompt Clarification |
| **Firebase Admin SDK** | — | Server-side authentication |

### Frontend
| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **React** | 19 | UI framework |
| **Vite** | 8 | Build tool & Dev server |
| **Goong Maps JS** | 1.0.9 | Bản đồ Việt Nam |
| **TailwindCSS** | 4.2 | Styling |
| **Shadcn/UI + Radix** | — | Component library |
| **Firebase Client SDK** | 12.13 | Authentication |
| **React Router** | 7.15 | Client-side routing |
| **Lucide React** | — | Icon library |

### Infrastructure
| Công nghệ | Vai trò |
|-----------|---------|
| **Docker Compose** | Container orchestration cho PostgreSQL + pgvector |
| **Goong Maps REST API** | Distance Matrix, Directions, Autocomplete, Geocode |
| **OpenStreetMap (Overpass API)** | Nguồn dữ liệu POI gốc (data pipeline) |
| **Bing Image Crawler** | Thu thập ảnh địa điểm tự động (data pipeline) |

---

## Cấu trúc mã nguồn

```
N09_TDTT/
├── backend/                    # Django REST API Server
│   ├── api/                    #    Core App — Toàn bộ logic nghiệp vụ & AI
│   │   ├── views.py            #    API endpoints (smart-itinerary, search, share, vibes, profile)
│   │   ├── ai_services.py      #    SBERT/CLIP embedding + Gemini AI scoring + Prompt clarification
│   │   ├── semantic_search.py  #    Dual-Vector search engine (CLIP 40% + SBERT 60%)
│   │   ├── itinerary_optimizer.py  # Genetic Algorithm optimizer + Goong routing adapter
│   │   ├── goong_service.py    #    Goong Maps API wrapper (Distance Matrix, Directions, Geocode)
│   │   ├── models.py           #    Database models (PointOfInterest, SharedRoute, VibeTag, UserProfile)
│   │   └── serializers.py      #    DRF serializers
│   ├── users/                  # Firebase Authentication backend
│   │   └── authentication.py   #    Custom DRF authentication class cho Firebase ID Token
│   ├── tours/                  # Graph data models (Node, Edge, POI) — legacy
│   ├── core/                   # Django project config (settings, urls, wsgi)
│   └── data/                   # Seed data (district1_full_data.json, vibe_tags_seed.json)
│
├── frontend/                   # React 19 + Vite 8 SPA
│   └── src/
│       ├── pages/              # Route pages
│       │   ├── MainPage.jsx    #    Trang chính: Sidebar + MapView + Onboarding modal
│       │   ├── LoginPage.jsx   #    Đăng nhập (Firebase Auth)
│       │   ├── RegisterPage.jsx#    Đăng ký
│       │   ├── OnboardingPage.jsx   # Onboarding: Chọn Vibe Tags lần đầu
│       │   └── SharedRoutePage.jsx  # Xem lộ trình được chia sẻ (public)
│       ├── components/
│       │   ├── Sidebar.jsx     #    Panel điều khiển: tìm kiếm, thêm stops, xem kết quả
│       │   ├── Map/MapView.jsx #    Goong Maps: markers, polyline, popup
│       │   ├── AIClarification.jsx  # UI cho AI Gatekeeper (câu hỏi phỏng vấn)
│       │   ├── ProfileModal.jsx#    Modal chỉnh sửa profile & vibe tags
│       │   └── UserAuthMenu.jsx#    Menu đăng nhập/đăng xuất
│       └── firebase.js         # Firebase client config
│
├── scripts/                    # Data Pipeline Tools
│   ├── caodata.ipynb           #    Notebook: Crawl POI từ OpenStreetMap (Overpass API)
│   ├── crawl_poi_images.py     #    Script: Tải ảnh địa điểm từ Bing Images
│   └── generate_vectors.py     #    Script: Sinh CLIP image vectors offline
│
└── docker-compose.yml          # PostgreSQL + pgvector container
```

---

## API Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/smart-itinerary/` | Tạo lộ trình thông minh (core endpoint) | Optional |
| `GET` | `/api/search-locations/?name=...` | Tìm kiếm địa điểm theo tên | — |
| `POST` | `/api/shared-routes/` | Tạo link chia sẻ lộ trình | — |
| `GET` | `/api/shared-routes/:share_id/` | Xem lộ trình được chia sẻ | — |
| `GET` | `/api/goong/autocomplete/?input=...` | Gợi ý địa điểm (Goong Proxy) | — |
| `GET` | `/api/goong/place-detail/?place_id=...` | Chi tiết địa điểm (Goong Proxy) | — |
| `GET` | `/api/goong/geocode/?address=...&latlng=...` | Geocode/Reverse Geocode | — |
| `GET` | `/api/vibes/` | Lấy danh sách Vibe Tags (grouped) | — |
| `GET/POST` | `/api/profile/vibes/` | Đọc/Cập nhật sở thích người dùng |  Firebase |
| `GET/POST` | `/api/profile/` | Đọc/Cập nhật profile người dùng |  Firebase |

---

## Hướng dẫn cài đặt

### Yêu cầu hệ thống
- **Docker Desktop** (cho PostgreSQL + pgvector)
- **Python 3.10+** + pip
- **Node.js 18+** + npm
- **API Keys:** Goong Maps (bắt buộc), Google Gemini AI (tùy chọn), Firebase (cho Auth)

### 1. Khởi động Database

```bash
docker compose up -d
```

### 2. Cấu hình biến môi trường

**`backend/.env`**
```env
# Goong Maps (Bắt buộc)
GOONG_API_KEY=your_goong_rest_api_key

# Database
DB_NAME=n09_tdtt_db
DB_USER=admin
DB_PASSWORD=admin_password
DB_HOST=127.0.0.1
DB_PORT=5433

# Gemini AI (Tùy chọn — hệ thống vẫn hoạt động nếu không có)
GEMINI_API_KEY=your_gemini_api_key
```

**`frontend/.env`**
```env
VITE_GOONG_MAPTILES_KEY=your_goong_maptiles_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
```

### 3. Khởi động Backend

```bash
cd backend
python -m venv venv && source venv/Scripts/activate   # Windows
pip install -r requirements.txt
python manage.py makemigrations && python manage.py migrate
python manage.py import_pois --clear data/district1_full_data.json
python manage.py import_vibes
python manage.py runserver
```

### 4. Khởi động Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cập ứng dụng tại **http://localhost:5173**

> **Lưu ý:** Lần đầu tìm kiếm, hệ thống sẽ tải model AI từ HuggingFace (~600MB cho CLIP + SBERT). Đảm bảo kết nối mạng ổn định.

---

## Thông tin nhóm

**Nhóm 09** — Môn Tư duy Tính toán  
Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM (HCMUS)

---

<div align="center">

*Built with ❤️ using Django, React, and AI*

</div>
