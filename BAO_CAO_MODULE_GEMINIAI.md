# 📄 Báo cáo Module: Tích hợp Gemini AI vào hệ thống chấm điểm lộ trình

> **Người phụ trách:** Huỳnh Chí Thoại  
> **Ngày báo cáo:** 11/05/2026  
> **Cập nhật lần cuối:** 16/05/2026 (Fix Vibe + Rating + Công thức mới)  
> **Trạng thái:** ✅ Scoring Pipeline đã hoạt động đầy đủ

---

## 1. Mục tiêu của Module

Tích hợp **Google Gemini API** vào pipeline tối ưu hóa lộ trình để bổ sung một lớp đánh giá thông minh (AI Scoring — Vòng 2), giúp hệ thống không chỉ dựa vào thuật toán Genetic Algorithm mà còn có "con mắt" của AI đánh giá tính logic của lộ trình.

---

## 2. Những gì đã hoàn thành ✅

### 2.1. Kiến trúc tổng thể — Scoring Pipeline 2 Vòng

Hệ thống chấm điểm lộ trình hoạt động theo mô hình **2 vòng**:

| Vòng | Tên | Phương pháp | Trọng số |
|---|---|---|---|
| **Vòng 1** | `score_v1` | Tính hoàn toàn bằng Python (Cosine Similarity + Vibe Tag + Time Penalty) | 70% |
| **Vòng 2** | `ai_score` | Gọi Gemini API chấm điểm logic địa lý | 30% |

**Công thức:** `final_score = 0.7 × score_v1 + 0.3 × ai_score`

> **Lưu ý:** Nếu Gemini API không khả dụng (lỗi, hết quota, chưa cấu hình key), hệ thống sẽ tự động **fallback** dùng `score_v1` làm `final_score`, đảm bảo người dùng vẫn nhận được kết quả bình thường.

### 2.2. Tối ưu hóa tài nguyên API

| Hạng mục | Trước khi tối ưu | Sau khi tối ưu |
|---|---|---|
| Số lần gọi API / request | 4 lần (1 chấm điểm + 3 storytelling) | **1 lần duy nhất** (chỉ chấm điểm) |
| Kích thước Prompt | ~1500 tokens (mô tả chi tiết) | **~200 tokens** (JSON tối giản) |
| Storytelling (kể chuyện) | Gọi API Gemini (3 lần) | **Sinh local** bằng hàm `_generate_ai_reason()` |
| Retry khi hết quota ngày | Retry 2 lần (lãng phí 21 giây) | **Bỏ qua ngay lập tức** (0 giây) |

### 2.3. Cơ chế Retry thông minh

Hàm `_call_gemini_with_retry()` phân biệt 2 loại rate limit:

- **Per-Minute (RPM):** Retry tối đa 2 lần với exponential backoff (7s → 14s).
- **Per-Day (hết quota ngày):** Bỏ qua ngay lập tức, không retry, để response nhanh nhất.

### 2.4. Storytelling Local

Thay vì gọi API để AI viết mô tả cho mỗi lộ trình (tốn 3 API call), module đã triển khai hàm `_generate_ai_reason()` trong `itinerary_optimizer.py` — hoàn toàn miễn phí, không tốn API quota.

### 2.5. Migration SDK & Dọn dẹp cấu hình

- **SDK:** Chuyển từ `google-generativeai` (deprecated) sang `google-genai` v2.x.
- **Dọn dẹp `.env`:** Xóa file `.env` trùng lặp ở thư mục gốc.
- **`settings.py`:** Chỉ load `backend/.env` với `override=True`.

---

## 3. Kết quả kiểm tra & Cập nhật Scoring Pipeline (16/05/2026)

### 3.1. Vòng 1 — `score_v1` (70%) — Công thức đã cập nhật

**Công thức mới:** `score_v1 = 0.5 × S_prompt + 0.3 × S_pref + 0.2 × S_time`

#### 3.1.1. S_prompt (50%) — Cosine Similarity ✅

| Mục | Chi tiết |
|---|---|
| **Cách hoạt động** | Model `keepitreal/vietnamese-sbert` encode prompt + mô tả POI → tính `cos_sim()` → lấy **max**. |
| **Trọng số** | **50%** (tăng từ 40%) — Thành phần đáng tin nhất, dùng AI chuyên dụng tiếng Việt. |

#### 3.1.2. S_pref (30%) — Vibe Tag Matching ✅ ĐÃ FIX

| Mục | Chi tiết |
|---|---|
| **Cách hoạt động** | Dùng `prompt_keyword` (VD: `"cafe, cà phê"`) thay vì `label` (VD: `"Nghiện Cafe"`). Tách keyword theo dấu phẩy, kiểm tra trong `category + name + description`. |
| **Lỗi cũ** | (1) Frontend chỉ lưu localStorage, KHÔNG gọi API backend. (2) Backend thiếu auth decorator. (3) Matching dùng label thô. |
| **Fix** | Viết lại `vibeApi.js` để sync với backend, thêm auth, dùng prompt_keyword. |

#### 3.1.3. S_time (20%) — Time Penalty ✅

| Mục | Chi tiết |
|---|---|
| **Cách hoạt động** | `S_time = max(0.1, 1.0 - total_seconds / 18000)`. Dữ liệu từ **Goong Distance Matrix API** (realtime). |

#### 3.1.4. Về Rating — Tại sao loại bỏ?

File dữ liệu gốc `district1_full_data.json` **KHÔNG có trường `rating`** → Tất cả 200 POI có `rating = 0` → Rating giả = 3.0 cho MỌI POI → **Vô nghĩa**. Đã loại bỏ, kiến trúc sẵn sàng thêm lại khi có dữ liệu thực.

| Thành phần | Trọng số | Nguồn dữ liệu | Trạng thái |
|---|---|---|---|
| S_prompt (Cosine Similarity) | **50%** | Vietnamese SBERT | ✅ |
| S_pref (Vibe Tag) | **30%** | User profile + prompt_keyword | ✅ Đã fix |
| S_time (Time Penalty) | **20%** | Goong API | ✅ |

---

### 3.2. Vòng 2 — Gemini AI Scoring (30%) ✅ HOẠT ĐỘNG ỔN ĐỊNH

| Mục | Chi tiết |
|---|---|
| **Model** | `gemini-2.5-flash` |
| **Trạng thái** | ✅ Ổn định — `[Gemini] Scoring & Reasoning OK` |
| **Cách hoạt động** | Gửi danh sách POI + prompt lên Gemini, chấm 3 tiêu chí: Phù hợp ý định, Đa dạng trải nghiệm, Logic di chuyển. |
| **Fallback** | Gemini lỗi → dùng `score_v1`. Web vẫn chạy bình thường. |

---

## 4. Danh sách các file đã thay đổi

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `backend/api/ai_services.py` | **Viết lại scoring** | Công thức 50/30/20, bỏ rating giả, dùng prompt_keyword |
| `backend/api/views.py` | **Sửa đổi** | Thêm `@authentication_classes` cho `smartItinerary` |
| `backend/api/semantic_search.py` | **Sửa đổi** | Thêm `rating`, `description` vào cache và search results |
| `frontend/src/lib/vibeApi.js` | **Viết lại** | Sync vibes lên backend khi đăng nhập, fallback localStorage |
| `frontend/src/components/Sidebar.jsx` | **Sửa đổi** | Thêm Firebase token vào API calls |

---

## 5. Lỗi đã phát hiện & Trạng thái khắc phục

### 5.1. ✅ Rating luôn = 3.0 → ĐÃ XỬ LÝ

**Nguyên nhân:** File JSON gốc không có trường `rating` → DB lưu `rating = 0`.  
**Giải pháp:** Loại bỏ rating giả, chuyển sang `S_time` (dữ liệu thực từ Goong API).

### 5.2. ✅ Vibe Tag không hoạt động → ĐÃ FIX

**Nguyên nhân (3 lỗi chồng nhau):**
1. `vibeApi.js`: `saveUserVibes()` chỉ lưu localStorage, KHÔNG gọi POST API.
2. `views.py`: `smartItinerary` thiếu `@authentication_classes` → không nhận diện user.
3. `ai_services.py`: Matching dùng `label` thay vì `prompt_keyword`.

**Giải pháp:** Fix cả 3 — vibeApi gọi API + gửi token, views thêm auth, scoring dùng prompt_keyword.

---

## 6. Lưu ý kỹ thuật cho team

### Cách thay đổi Model Gemini

Sửa **1 dòng** trong `backend/api/ai_services.py`:

```python
GEMINI_MODEL = 'gemini-2.5-flash'  # ← Thay bằng model mới tại đây
```

### Cách tắt hoàn toàn Gemini

Xóa hoặc comment dòng `GEMINI_API_KEY` trong `backend/.env`. Hệ thống sẽ tự bỏ qua Gemini scoring.

### Cách test nhanh

```bash
cd backend && source ./venv/Scripts/activate && python manage.py runserver
```

Gõ tìm kiếm trên giao diện → Nếu terminal hiện `[Gemini] Scoring OK` → API hoạt động.  
Nếu hiện `[Gemini Scoring Error]` → API lỗi nhưng web vẫn chạy bình thường.

---

*Module này được thiết kế theo nguyên tắc **Graceful Degradation** — hệ thống luôn hoạt động ổn định bất kể API bên ngoài có khả dụng hay không.*
