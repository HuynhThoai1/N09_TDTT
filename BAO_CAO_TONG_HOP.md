# 📋 BÁO CÁO TỔNG HỢP HỆ THỐNG GỢI Ý LỘ TRÌNH THÔNG MINH

> **Nhóm:** N09 — Tư Duy Tính Toán  
> **Ngày cập nhật:** 16/05/2026  
> **Trạng thái:** ✅ Hoạt động ổn định

---

## 1. Tổng quan hệ thống

### 1.1. Mục tiêu

Xây dựng một hệ thống web gợi ý lộ trình du lịch thông minh tại Quận 1, TP.HCM, kết hợp nhiều lớp AI để đề xuất lộ trình **cá nhân hóa**, **tối ưu thời gian**, và **phù hợp sở thích** của từng người dùng.

### 1.2. Kiến trúc tổng quát

| Tầng | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | React + Vite + TailwindCSS | Giao diện bản đồ, nhập prompt, hiển thị lộ trình |
| **Backend** | Django REST Framework (Python) | API xử lý logic, AI scoring, tối ưu hóa |
| **Database** | PostgreSQL | Lưu 200 POI, user profiles, vibe tags, shared routes |
| **AI Models** | CLIP, Vietnamese SBERT, Gemini 2.5 Flash | Tìm kiếm ngữ nghĩa, chấm điểm, hỏi ngược |
| **Map API** | Goong (tương đương Google Maps cho VN) | Distance Matrix, Directions, Autocomplete |
| **Auth** | Firebase Authentication | Đăng nhập/đăng ký, xác thực token |

---

## 2. Pipeline xử lý — Từ Input đến Output

Khi người dùng nhập yêu cầu (VD: *"đi sinh nhật bạn gái"*) và chọn điểm xuất phát, hệ thống xử lý qua **6 bước tuần tự**:

```
┌──────────────────────────────────────────────────────────────────┐
│  👤 User: "đi sinh nhật bạn gái" + chọn Nhà thờ Sài Gòn        │
└──────────┬───────────────────────────────────────────────────────┘
           ▼
┌──────────────────────┐
│  Bước 1: Gatekeeper  │ → Prompt đủ rõ chưa? Nếu chưa → hỏi ngược 3 câu
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Bước 2: Enrich Data │ → Tra DB lấy chi tiết POI (ảnh, tọa độ, category...)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Bước 3: Sem. Search │ → CLIP + SBERT tìm Top 15 POI liên quan
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Bước 4: Gen. Algo.  │ → Sinh 10 tổ hợp route → tối ưu thứ tự di chuyển
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Bước 5: Score V1    │ → Chấm điểm: 50% Prompt + 30% Vibe + 20% Time
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Bước 6: Gemini AI   │ → Chấm 3 tiêu chí → Sắp xếp → Trả Top 3
└──────────┬───────────┘
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  📤 Output: 3 lộ trình tối ưu + polyline trên bản đồ + lý do   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Bước 1: AI Gatekeeper — Hỏi ngược thông minh

**File:** `ai_services.py` → `analyze_prompt_clarification()`

| Mục | Chi tiết |
|---|---|
| **Mục đích** | Phân tích prompt có đủ thông tin để tạo lộ trình tốt không |
| **Cách hoạt động** | Gửi prompt lên Gemini 2.5 Flash kèm system instruction → AI đánh giá → nếu thiếu thông tin → trả về 2-3 câu hỏi dạng trắc nghiệm |
| **Ví dụ** | Prompt *"đi chơi"* → AI hỏi: Ai đi cùng? Phong cách? Ngân sách? |
| **Fallback** | Nếu Gemini lỗi → cho phép đi tiếp (không block user) |

---

### Bước 2: Enrich Stops — Làm giàu dữ liệu

**File:** `views.py` → `smartItinerary()` dòng 178-221

Mỗi điểm dừng do user chọn trên bản đồ chỉ có `poi_id + lat/lng`. Backend tra cứu PostgreSQL để bổ sung: tên, ảnh, category, description, address, rating.

---

### Bước 3: Semantic Search — Tìm kiếm ngữ nghĩa đa kênh (Dual-Vector)

**File:** `semantic_search.py` → `find_related_pois()`

Đây là bước quan trọng nhất, quyết định **POI nào được đưa vào ứng viên** cho lộ trình.

#### 3.1. Kiến trúc Dual-Vector

Hệ thống sử dụng **2 model AI song song** để tìm kiếm:

| Kênh | Model | Input → Output | Mục đích |
|---|---|---|---|
| **Visual** (40%) | `CLIP ViT-B/32` | Text prompt → so sánh với vector ẢNH | Tìm POI có hình ảnh phù hợp với mô tả |
| **Text** (60%) | `Vietnamese SBERT` | Text prompt → so sánh với vector TEXT | Tìm POI có tên/category/mô tả phù hợp |

**Công thức kết hợp:**
```
combined_score = 0.6 × text_score + 0.4 × visual_score
```

#### 3.2. Dữ liệu vector được tạo như thế nào?

| Trường | Nguồn gốc | Cách tạo |
|---|---|---|
| `vector` (CLIP, 512 dims) | Script `caodata.ipynb` | Crawl ảnh thật từ Bing → `CLIP.encode(ảnh)` |
| `text_vector` (SBERT, 768 dims) | Script `reindex_standalone.py` | `SBERT.encode("{name} {category} {description}")` |

**Lưu ý quan trọng:** Vector CLIP trong DB là **vector ẢNH THẬT** (crawl từ Bing Image Search với keyword `"{tên POI} Saigon Tourist"`). Khi search, hệ thống encode **TEXT** bằng CLIP rồi so với vector ẢNH → đây là **cross-modal search (text-to-image)** — một khả năng đặc biệt của CLIP cho phép tìm kiếm địa điểm dựa trên hình ảnh.

#### 3.3. Caching

```python
CACHE_TTL = 300  # 5 phút
```

200 POI vectors được cache trong RAM. Mỗi 5 phút reload từ DB. Tránh truy vấn DB mỗi request.

#### 3.4. Output

Top 15 POI có `combined_score ≥ 0.15` được chọn làm ứng viên bonus cho lộ trình.

---

### Bước 4: Genetic Algorithm — Tối ưu hóa di truyền

**File:** `itinerary_optimizer.py` → `GeneticOptimizer`

| Tham số | Giá trị |
|---|---|
| Quần thể | 50 cá thể |
| Số thế hệ | 40 (full) / 20 (nhanh cho intent-driven) |
| Elitism | Giữ top 20% |
| Mutation rate | 10% |
| Max bonus stops | 3 POI bổ sung |

#### 4.1. Hàm Fitness

```
fitness = (similarity_profit × 10) − time_penalty + diversity_bonus − cluster_penalty
```

| Thành phần | Giải thích |
|---|---|
| `similarity_profit` | Tổng cosine similarity của các POI trong route |
| `time_penalty` | Tổng thời gian di chuyển / 3600 (phạt route quá dài) |
| `diversity_bonus` | `số_category_khác_nhau × 0.5` (thưởng đa dạng: café + ăn + tham quan) |
| `cluster_penalty` | `+1.0` cho mỗi cặp điểm di chuyển < 1 phút (tránh 2 điểm sát nhau) |

#### 4.2. Hai chế độ hoạt động

| Chế độ | Khi nào? | Cách hoạt động |
|---|---|---|
| **Tối ưu hành trình** | User chọn ≥ 2 stops | Giữ nguyên stops, tối ưu thứ tự + chèn thêm bonus |
| **Gợi ý ý tưởng** | User chỉ chọn 1 stop | Sinh 10 tổ hợp route khác nhau → GA tối ưu → Score V1 chấm → lấy Top 3 |

---

### Bước 5: Score V1 — Chấm điểm lộ trình (Python-based)

**File:** `ai_services.py` → `calculate_route_score_v1()`

**Công thức:**
```
score_v1 = 0.5 × S_prompt + 0.3 × S_pref + 0.2 × S_time
```

#### 5.1. S_prompt (50%) — Cosine Similarity

| Mục | Chi tiết |
|---|---|
| Model | `keepitreal/vietnamese-sbert` |
| Cách tính | Encode prompt → encode mô tả từng POI → `cos_sim()` → lấy max |
| Ý nghĩa | Route này có **khớp ý định** người dùng không? |

#### 5.2. S_pref (30%) — Semantic Vibe Matching

| Mục | Chi tiết |
|---|---|
| Model | `keepitreal/vietnamese-sbert` (cùng model S_prompt) |
| Cách tính | Encode vibe keywords → encode POI descriptions → `cos_sim()` → nếu ≥ 0.35 → match |
| Ý nghĩa | Route có **phù hợp sở thích cá nhân** (vibe tags) không? |

Hệ thống Vibe Tag gồm 12 thẻ sở thích (VD: "Nghiện Cafe", "Đam mê Lịch sử", "Đi chơi buổi tối"...). Mỗi thẻ có trường `prompt_keyword` chứa các từ khóa ngữ nghĩa (VD: `"quán cà phê, không gian chill, cafe view đẹp"`).

Khi match, hệ thống encode toàn bộ prompt_keyword và mô tả POI thành vector, tính cosine similarity — đây là **semantic matching** thay vì substring matching, cho phép hiểu ngữ nghĩa đa dạng của ngôn ngữ tự nhiên.

#### 5.3. S_time (20%) — Time Penalty

| Mục | Chi tiết |
|---|---|
| Nguồn dữ liệu | Goong Distance Matrix API (realtime) |
| Công thức | `S_time = max(0.1, 1.0 − total_seconds / 18000)` |
| Ý nghĩa | Ưu tiên route **di chuyển ngắn** hơn (< 5 giờ) |

---

### Bước 6: Gemini AI Score V2 — Đánh giá bằng LLM

**File:** `ai_services.py` → `evaluate_routes_with_gemini()`

| Mục | Chi tiết |
|---|---|
| Model | `gemini-2.5-flash` (Google AI) |
| Số API call | **1 lần duy nhất** cho cả 3 routes |
| Prompt size | ~200 tokens |

#### 6.1. Tiêu chí chấm điểm (mỗi tiêu chí 1-10)

1. **Phù hợp ý định** — Lộ trình có đáp ứng đúng yêu cầu không?
2. **Đa dạng trải nghiệm** — Có mix ăn uống, tham quan, giải trí không?
3. **Logic di chuyển** — Các điểm gần nhau, thứ tự hợp lý không?

#### 6.2. Công thức final score

```
final_score = 0.7 × score_v1 + 0.3 × (gemini_score / 10)
```

#### 6.3. Cơ chế Graceful Degradation

Nếu Gemini API lỗi (hết quota, timeout, network):
- **KHÔNG crash** → fallback dùng `score_v1` làm `final_score`
- Web vẫn chạy bình thường, chỉ mất lớp đánh giá AI

---

## 3. Hệ thống cá nhân hóa (Vibe Tags)

### 3.1. Danh sách Vibe Tags

| Nhóm | Thẻ | Từ khóa ngữ nghĩa |
|---|---|---|
| 🌿 Không gian | Yêu thiên nhiên | công viên, cây xanh, hồ nước |
| 🌿 Không gian | Thích yên tĩnh | yên tĩnh, ít người, thư giãn |
| 🌿 Không gian | Phố xá nhộn nhịp | trung tâm thành phố, phố đi bộ |
| ☕ Ẩm thực | Nghiện Cafe | quán cà phê, chill, cafe view đẹp |
| 🍜 Ẩm thực | Món đường phố | ăn vặt, quán vỉa hè, bình dân |
| 🍽️ Ẩm thực | Fine Dining | nhà hàng cao cấp, ẩm thực tinh tế |
| 🏛️ Văn hóa | Đam mê Lịch sử | di tích, bảo tàng, kiến trúc cổ |
| 🎨 Văn hóa | Yêu Nghệ thuật | gallery, triển lãm, nghệ thuật đương đại |
| 🙏 Văn hóa | Tín ngưỡng | chùa, nhà thờ, tâm linh |
| 🧭 Hoạt động | Thích Khám phá | hidden gem, trải nghiệm độc đáo |
| 🛍️ Hoạt động | Mua sắm | trung tâm thương mại, shop thời trang |
| 🌙 Thời điểm | Đi chơi buổi tối | nightlife, đèn lung linh |
| 🌅 Thời điểm | Buổi sáng sớm | tập thể dục, chợ sáng |

### 3.2. Luồng hoạt động

```
User đăng ký → Chọn 1-5 Vibe Tags → Lưu vào Django DB qua Firebase Auth
                                              ↓
User gợi ý lộ trình → Backend load vibes → Encode thành vector → Semantic match với POI
```

---

## 4. Nguồn dữ liệu

### 4.1. POI Data (200 địa điểm Quận 1)

| Bước | Công cụ | Mô tả |
|---|---|---|
| 1. Quét địa danh | OpenStreetMap Overpass API | Query 250 nodes: restaurant, cafe, museum, attraction... |
| 2. Crawl ảnh | Bing Image Crawler (icrawler) | 3 ảnh/POI, keyword: `"{name} Saigon Tourist"` |
| 3. Sinh vector ảnh | CLIP ViT-B/32 | `model.encode(ảnh)` → 512 dims |
| 4. Sinh vector text | Vietnamese SBERT | `model.encode("{name} {category} {desc}")` → 768 dims |
| 5. Đóng gói | JSON + ZIP media | `district1_full_data.json` + thư mục `media/locations/` |

### 4.2. Hạn chế dữ liệu đã biết

| Hạn chế | Ảnh hưởng | Ghi chú |
|---|---|---|
| **Không có trường `rating`** | Không thể đánh giá chất lượng POI từ cộng đồng | Đã loại bỏ rating khỏi công thức scoring |
| **Description generic** | `"Một {category} đặc sắc tọa lạc tại Quận 1"` cho tất cả POI | SBERT matching dựa chủ yếu vào name + category |
| **Ảnh crawl Bing** | Chất lượng không đồng đều (có thể là logo, ảnh stock) | CLIP cross-modal search hoạt động nhưng có nhiễu |

---

## 5. Công nghệ AI sử dụng

| Model | Loại | Kích thước | Vai trò trong hệ thống |
|---|---|---|---|
| **CLIP ViT-B/32** | Vision-Language | ~340MB | Encode ảnh POI → vector; Cross-modal search (text→image) |
| **Vietnamese SBERT** | Text Embedding | ~420MB | Encode text → vector; Semantic search, Scoring, Vibe matching |
| **Gemini 2.5 Flash** | Large Language Model | Cloud API | Gatekeeper (hỏi ngược), Scoring V2 (chấm logic), Storytelling |

### Tổng RAM AI Models: ~760MB (load 1 lần khi khởi động server)

---

## 6. API Endpoints chính

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/smart-itinerary/` | POST | Pipeline chính: nhận prompt + stops → trả 3 routes |
| `/api/vibes/` | GET | Lấy danh sách 12 vibe tags |
| `/api/profile/vibes/` | GET/POST | Load/save vibes của user (cần Firebase token) |
| `/api/goong/autocomplete/` | GET | Tìm kiếm địa điểm trên bản đồ |
| `/api/goong/place-detail/` | GET | Chi tiết địa điểm |
| `/api/share-route/` | POST | Tạo link chia sẻ lộ trình |

---

## 7. Cơ chế an toàn (Graceful Degradation)

Hệ thống được thiết kế để **không bao giờ crash** ngay cả khi các dịch vụ bên ngoài lỗi:

| Dịch vụ lỗi | Hành vi fallback |
|---|---|
| Gemini API hết quota | Bỏ qua scoring V2, dùng score_v1 |
| Gemini API không có key | Bỏ qua hoàn toàn Gemini, dùng score_v1 |
| Goong Distance Matrix lỗi | Dùng ma trận dummy (thời gian = 0) |
| Firebase Auth lỗi | Bỏ qua vibes, chạy như guest |
| CLIP model load fail | Dùng chỉ SBERT cho search |

---

## 8. Danh sách file quan trọng

| File | Chức năng |
|---|---|
| `backend/api/views.py` | Endpoint chính `smartItinerary`, auth, enrich stops |
| `backend/api/ai_services.py` | Score V1, Gemini scoring, Gatekeeper |
| `backend/api/semantic_search.py` | Dual-Vector search (CLIP + SBERT) |
| `backend/api/itinerary_optimizer.py` | Genetic Algorithm, Goong API adapter |
| `backend/api/models.py` | PointOfInterest, VibeTag, UserProfile |
| `backend/users/authentication.py` | Firebase token verification |
| `frontend/src/components/Sidebar.jsx` | UI chính: nhập prompt, hiển thị routes |
| `frontend/src/lib/vibeApi.js` | Sync vibes frontend ↔ backend |
| `scripts/caodata.ipynb` | Script crawl 200 POI + ảnh + vector |
