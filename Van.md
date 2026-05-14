# 📋 BÁO CÁO MERGE — AI Smart Travel Planner (Backend)

> **Người thực hiện:** Vân  
> **Ngày cập nhật:** 12/05/2026  
> **Trạng thái:** ⚠️ Hoàn thành logic, chưa test end-to-end (thiếu dữ liệu thật)

---

## 1. TỔNG QUAN DỰ ÁN

Hệ thống **AI Smart Travel Planner** — gợi ý lộ trình du lịch TP.HCM thông minh, kết hợp:
- **Dual-Vector Semantic Search** (SBERT + CLIP) để tìm địa điểm theo ngữ nghĩa.
- **Genetic Algorithm (GA)** để tối ưu hóa hành trình (thời gian, quãng đường, đa dạng).
- **Gemini AI Scoring** để chấm điểm + giải thích lộ trình bằng ngôn ngữ tự nhiên.
- **AI Gatekeeper** (Cơ chế hỏi ngược) để thu thập thêm thông tin từ người dùng trước khi chạy thuật toán.

---

## 2. WORKFLOW HIỆN TẠI

```
Người dùng nhập prompt (VD: "Muốn đi cafe yên tĩnh quận 1")
        │
        ▼
┌─────────────────────────┐
│  AI Gatekeeper (Gemini) │ ← Kiểm tra prompt đủ thông tin chưa?
│  Nếu chưa → Hỏi ngược  │   (Đi với ai? Phong cách? Ngân sách?)
└──────────┬──────────────┘
           │ Đủ thông tin
           ▼
┌──────────────────────────────┐
│  Semantic Search (SBERT 60%  │ ← Tìm địa điểm phù hợp nhất
│  + CLIP 40%)                 │   trong database bằng vector similarity
└──────────┬───────────────────┘
           │ Top 15 ứng viên
           ▼
┌──────────────────────────────┐
│  Genetic Algorithm (GA)      │ ← Tối ưu thứ tự di chuyển
│  + Goong Distance Matrix API │   Fitness = Profit - TimePenalty
│                              │   + DiversityBonus - ClusterPenalty
└──────────┬───────────────────┘
           │ Top 3 routes
           ▼
┌──────────────────────────────┐
│  Gemini AI Scoring (Vòng 2)  │ ← Chấm điểm logic + viết lý do
│  Final = 0.7*V1 + 0.3*Gemini│   (1 API call duy nhất cho 3 routes)
└──────────┬───────────────────┘
           │
           ▼
     Trả về Frontend
     (3 lộ trình + polyline + lý do AI)
```

---

## 3. CẤU TRÚC THƯ MỤC BACKEND

```
backend/
├── .env                          # API Keys (Goong, Gemini)
├── manage.py
├── requirements.txt              # Dependencies
├── core/
│   ├── settings.py
│   └── urls.py                   # Đăng ký tất cả API endpoints
└── api/
    ├── models.py                 # Database models (POI, SharedRoute, VibeTag...)
    ├── views.py                  # API endpoints chính
    ├── serializers.py            # DRF serializers
    ├── ai_services.py            # SBERT, CLIP, Gemini integration
    ├── semantic_search.py        # Dual-Vector search engine
    ├── itinerary_optimizer.py    # Genetic Algorithm + Goong routing
    ├── goong_service.py          # Goong Maps API wrapper
    ├── apps.py                   # Auto-load AI models khi server start
    ├── share_utils.py            # Helper tạo share_id
    └── management/commands/
        ├── import_pois.py        # ⭐ Nạp dữ liệu JSON vào DB + tự động vector hóa
        ├── reindex_text_vectors.py  # Tính lại SBERT vector cho toàn bộ POIs
        ├── generate_vectors.py   # Tạo CLIP vector cho POIs
        ├── import_vibes.py       # Nạp thẻ sở thích (VibeTag)
        └── crawl_pois.py         # Script cào dữ liệu (chưa hoàn thiện)
```

---

## 4. CHI TIẾT TỪNG FILE ĐÃ THÊM/SỬA

### 4.1. Files đã SỬA ĐỔI

| File | Thay đổi |
|------|----------|
| `models.py` | Thêm 2 trường: `rating` (FloatField) và `user_ratings_total` (IntegerField) vào model `PointOfInterest` |
| `views.py` | Thêm endpoint `reindex_vectors` (GET/POST) để tính lại text_vector qua HTTP |
| `urls.py` | Thêm route `api/reindex/` → `views.reindex_vectors` |

### 4.2. Files đã THÊM MỚI

| File | Mục đích |
|------|----------|
| `import_pois.py` | **Management command quan trọng nhất.** Xóa toàn bộ dữ liệu cũ → Đọc file JSON → Tạo POI mới → Tự động encode SBERT vector ngay khi import. Chạy bằng: `python manage.py import_pois <file.json>` |
| `reindex_text_vectors.py` | Management command để tính lại SBERT vector cho toàn bộ POIs đang có trong DB mà không xóa dữ liệu. Chạy bằng: `python manage.py reindex_text_vectors` |

---

## 5. THAY ĐỔI DATABASE SCHEMA

### Model `PointOfInterest` (bảng `points_of_interest`)

```python
# CÁC TRƯỜNG MỚI THÊM:
rating              = FloatField(default=0.0, null=True, blank=True)
user_ratings_total  = IntegerField(default=0, null=True, blank=True)
```

**⚠️ Cần chạy migration:**
```bash
python manage.py makemigrations
python manage.py migrate
```

### Schema đầy đủ hiện tại:

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `poi_id` | CharField(100) | ID định danh (unique) |
| `name` | CharField(255) | Tên địa điểm |
| `latitude` | FloatField | Vĩ độ |
| `longitude` | FloatField | Kinh độ |
| `address` | TextField | Địa chỉ |
| `category` | CharField(100) | Loại hình (cafe, restaurant...) |
| `description` | TextField | Mô tả chi tiết (SBERT đọc trường này) |
| `image` | CharField(500) | URL ảnh đại diện |
| `image_list` | JSONField | Danh sách URL ảnh phụ |
| `rating` | FloatField | ⭐ **MỚI** — Điểm đánh giá (0.0 - 5.0) |
| `user_ratings_total` | IntegerField | ⭐ **MỚI** — Tổng lượt đánh giá |
| `vector` | JSONField | CLIP vector (visual embedding) |
| `text_vector` | JSONField | SBERT vector (text embedding) |

---

## 6. API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/search-locations/?name=...` | Tìm kiếm địa điểm theo tên |
| POST | `/api/smart-itinerary/` | **API chính** — Tạo lộ trình thông minh |
| POST | `/api/shared-routes/` | Tạo link chia sẻ lộ trình |
| GET | `/api/shared-routes/<share_id>/` | Xem lộ trình đã chia sẻ |
| GET | `/api/goong/autocomplete/?input=...` | Gợi ý địa điểm (Goong) |
| GET | `/api/goong/place-detail/?place_id=...` | Chi tiết địa điểm (Goong) |
| GET | `/api/goong/geocode/?address=...` | Geocoding (Goong) |
| GET | `/api/vibes/` | Lấy danh sách thẻ sở thích |
| GET/POST | `/api/profile/vibes/` | Xem/Lưu sở thích người dùng |
| GET/POST | `/api/reindex/` | ⭐ **MỚI** — Tính lại vector cho toàn bộ POIs |

---

## 7. CÁCH CHẠY BACKEND

### 7.1. Cài đặt môi trường

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

### 7.2. Cấu hình `.env`

```env
DB_NAME=n09_tdtt_db
DB_USER=admin
DB_PASSWORD=admin_password
DB_HOST=localhost
DB_PORT=5432
GOONG_API_KEY=<key_goong_của_bạn>
GEMINI_API_KEY=<key_gemini_của_bạn>
```

### 7.3. Khởi tạo Database

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7.4. Nạp dữ liệu địa điểm

```bash
# Đặt file JSON vào thư mục backend/, sau đó:
python manage.py import_pois pois_hcm_data_full.json
```

Lệnh này sẽ:
1. Xóa toàn bộ dữ liệu cũ trong bảng `points_of_interest`
2. Đọc file JSON và tạo record mới
3. **Tự động** encode SBERT text_vector cho mỗi địa điểm

### 7.5. Chạy server

```bash
python manage.py runserver
```

> **Lưu ý:** Khi server khởi động, `apps.py` sẽ tự động nạp 3 model AI (SBERT, CLIP) vào RAM trong background thread. Lần đầu tiên chạy sẽ tải model từ HuggingFace (~500MB), các lần sau dùng cache.

---

## 8. THIẾU SÓT HIỆN TẠI

### 8.1. ❌ Chưa có dữ liệu thật trong Database
- Script cào dữ liệu từ Google Maps trên Colab bị Google **chặn IP** (Anti-bot), không lấy được data.
- Database hiện tại **rỗng** hoặc chỉ có dữ liệu test cũ.
- **Hệ quả:** Chưa thể test end-to-end luồng Semantic Search → GA → Gemini Scoring.

### 8.2. ❌ Chưa test import_pois.py
- File `import_pois.py` đã viết xong nhưng chưa có file JSON thật để chạy thử.

### 8.3. ❌ Trường `rating` và `reviews` chưa hiển thị trên Frontend
- Backend đã có sẵn 2 trường mới nhưng FE chưa cập nhật UI để hiển thị.

### 8.4. ⚠️ CLIP vector chưa tự động tạo khi import
- Lệnh `import_pois` chỉ tạo **SBERT text_vector** tự động.
- **CLIP vector** (trường `vector`) vẫn để `null` vì ảnh trong file JSON là link placeholder, không phải ảnh thật.

---

## 9. HƯỚNG DẪN CÀO DỮ LIỆU (cho người tiếp nhận)

### Cách 1: Google Places API (Khuyến nghị — Dữ liệu chính xác nhất)

**Yêu cầu:** Cần thẻ Visa/Mastercard để tạo tài khoản Google Cloud (được free 200$/tháng).

**Bước thực hiện:**
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo Project mới → Thêm Billing Account (gắn thẻ)
3. Bật **Places API (New)** trong Library
4. Tạo API Key trong Credentials
5. Chạy script sau trên **Google Colab**:

```python
import requests, json, time
from google.colab import files

API_KEY = "YOUR_GOOGLE_PLACES_API_KEY"

queries = [
    "Quán cafe đẹp Quận 1 TP HCM",
    "Nhà hàng ngon Quận 1 TP HCM",
    "Địa điểm du lịch nổi tiếng TP HCM",
    "Bảo tàng lịch sử TP HCM",
    "Công viên TP HCM",
    # ... thêm queries để đủ 300+ điểm
]

def get_photo_url(photo_name):
    # Sử dụng Google Places API Media endpoint để lấy URL ảnh gốc
    return f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&maxWidthPx=800&key={API_KEY}"

def fetch(queries):
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        # Bổ sung places.photos vào FieldMask
        "X-Goog-FieldMask": "places.displayName.text,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.editorialSummary.text,places.primaryTypeDisplayName.text,places.photos"
    }
    results = []
    for q in queries:
        r = requests.post(url, headers=headers, json={"textQuery": q, "languageCode": "vi", "maxResultCount": 20})
        if r.status_code == 200:
            for p in r.json().get('places', []):
                name = p.get('displayName', {}).get('text')
                if not name: continue
                desc = p.get('editorialSummary', {}).get('text') or f"Một địa điểm tại {p.get('formattedAddress')}."
                
                # Trích xuất hình ảnh (Lấy tối đa 5 ảnh: 1 chính + 4 phụ)
                photos = p.get('photos', [])
                image_urls = [get_photo_url(photo['name']) for photo in photos[:5]]
                
                # Phân tách ảnh chính (image) và các ảnh phụ trợ (image_list)
                main_image = image_urls[0] if len(image_urls) > 0 else "https://maps.gstatic.com/tactile/pane/default_geocode-2x.png"
                image_list = image_urls[1:] if len(image_urls) > 1 else []

                results.append({
                    "name": name,
                    "category": p.get('primaryTypeDisplayName', {}).get('text', 'Địa điểm'),
                    "lat": p.get('location', {}).get('latitude'),
                    "lng": p.get('location', {}).get('longitude'),
                    "address": p.get('formattedAddress'),
                    "description": desc,
                    "rating": p.get('rating', 4.5),
                    "reviews": p.get('userRatingCount', 100),
                    "image": main_image,
                    "image_list": image_list
                })
        time.sleep(1)
    return list({p['name']: p for p in results}.values())

data = fetch(queries)
with open('pois_hcm_data_full.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
files.download('pois_hcm_data_full.json')
```

6. Tải file `pois_hcm_data_full.json` về → Đặt vào thư mục `backend/`
7. Chạy: `python manage.py import_pois pois_hcm_data_full.json`

### Cách 2: OpenStreetMap + Mô tả tự sinh (Miễn phí, không cần thẻ)

Dùng Overpass API để lấy tên + tọa độ, sau đó dùng bộ từ điển mô tả tự sinh. Nhược điểm: description không thật 100%.

### Format JSON yêu cầu

File JSON phải có format như sau để `import_pois.py` đọc được:

```json
[
  {
    "name": "The Workshop Coffee",
    "category": "Quán cà phê",
    "lat": 10.7769,
    "lng": 106.7009,
    "address": "27 Ngô Đức Kế, Quận 1, TP.HCM",
    "description": "Quán cafe tầng cao trong chung cư cũ, view đẹp...",
    "image": "https://places.googleapis.com/v1/places/123/photos/456/media?...",
    "image_list": [
      "https://places.googleapis.com/v1/places/123/photos/789/media?...",
      "https://places.googleapis.com/v1/places/123/photos/abc/media?..."
    ],
    "rating": 4.6,
    "reviews": 1200
  }
]
```

---

## 10. DEPENDENCIES CẦN LƯU Ý

| Package | Mục đích | Ghi chú |
|---------|----------|---------|
| `sentence-transformers` | SBERT + CLIP models | Tải ~500MB lần đầu |
| `google-genai` | Gemini API client | Cần `GEMINI_API_KEY` |
| `python-dotenv` | Đọc file `.env` | |
| `psycopg2-binary` | PostgreSQL driver | |
| `numpy` | Tính toán ma trận GA | |
| `pillow` | Xử lý ảnh cho CLIP | |

---

## 11. CHECKLIST CHO NGƯỜI TIẾP NHẬN

- [ ] Chạy `makemigrations` + `migrate` để cập nhật schema mới (rating, user_ratings_total)
- [ ] Cào dữ liệu bằng Google Places API hoặc OpenStreetMap (xem Mục 9)
- [ ] Chạy `python manage.py import_pois pois_hcm_data_full.json` để nạp data
- [ ] Chạy server và test API `/api/smart-itinerary/` với dữ liệu thật
- [ ] Cập nhật Frontend để hiển thị `rating` và `reviews` trên UI
- [ ] Tinh chỉnh ngưỡng `min_score` trong `semantic_search.py` (dòng 76) sau khi có đủ data
- [ ] (Optional) Tạo CLIP vector cho ảnh thật bằng `python manage.py generate_vectors`
