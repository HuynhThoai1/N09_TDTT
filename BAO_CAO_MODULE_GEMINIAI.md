# 📄 Báo cáo Module: Tích hợp Gemini AI vào hệ thống chấm điểm lộ trình

> **Người phụ trách:** Huỳnh Chí Thoại  
> **Ngày báo cáo:** 11/05/2026  
> **Trạng thái:** ⚠️ Hoàn thành kiến trúc & Fallback — Chờ fix lỗi tương thích Model Gemini

---

## 1. Mục tiêu của Module

Tích hợp **Google Gemini API** vào pipeline tối ưu hóa lộ trình để bổ sung một lớp đánh giá thông minh (AI Scoring — Vòng 2), giúp hệ thống không chỉ dựa vào thuật toán Genetic Algorithm mà còn có "con mắt" của AI đánh giá tính logic của lộ trình.

---

## 2. Những gì đã hoàn thành ✅

### 2.1. Kiến trúc tổng thể — Scoring Pipeline 2 Vòng

Hệ thống chấm điểm lộ trình hiện tại hoạt động theo mô hình **2 vòng**:

| Vòng | Tên | Phương pháp | Trọng số |
|---|---|---|---|
| **Vòng 1** | `score_v1` | Tính hoàn toàn bằng Python (Cosine Similarity + Vibe Tag + Rating) | 70% |
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

Hàm `_call_gemini_with_retry()` trong `ai_services.py` phân biệt 2 loại rate limit:

- **Per-Minute (RPM):** Retry tối đa 2 lần với exponential backoff (7s → 14s).
- **Per-Day (hết quota ngày):** Bỏ qua ngay lập tức, không retry, để response nhanh nhất.

### 2.4. Storytelling Local

Thay vì gọi API để AI viết mô tả cho mỗi lộ trình (tốn 3 API call), module đã triển khai hàm `_generate_ai_reason()` trong `itinerary_optimizer.py`. Hàm này:

- Phân tích các điểm bonus có `similarity_score` cao nhất.
- Sử dụng template chuyên nghiệp kết hợp với dữ liệu thực (tên, category, description).
- Việt hóa category từ tiếng Anh sang tiếng Việt qua bảng `CATEGORY_MAP`.
- Hoàn toàn miễn phí, không tốn API quota.

### 2.5. Migration SDK & Dọn dẹp cấu hình

- **SDK:** Chuyển từ thư viện cũ `google-generativeai` (deprecated) sang `google-genai` v2.x.
- **Dọn dẹp `.env`:** Xóa file `.env` trùng lặp ở thư mục gốc (chứa placeholder `YOUR_GOONG_API_KEY_HERE`) để tránh xung đột biến môi trường.
- **`settings.py`:** Chỉ load `backend/.env` với `override=True` để đảm bảo key luôn đúng.

---

## 3. Những gì chưa hoàn thành ❌

### 3.1. Lỗi tương thích Model Gemini (404 NOT_FOUND)

**Hiện trạng:** Khi gọi API Gemini, server trả về lỗi:

```
404 NOT_FOUND: models/gemini-1.5-flash is not found for API version v1beta,
or is not supported for generateContent.
```

**Nguyên nhân phân tích:**
- Thư viện `google-genai` v2.x mặc định gọi endpoint `v1beta`.
- Một số model (như `gemini-1.5-flash`, `gemini-2.0-flash`) có thể không khả dụng trên endpoint `v1beta` tùy vào region hoặc trạng thái tài khoản.
- Tài khoản Free Tier mới tạo có thể bị hạn chế truy cập vào một số model nhất định.

**Hướng khắc phục (chưa triển khai):**
1. Gọi `client.models.list()` để kiểm tra danh sách model thực sự khả dụng trên API key hiện tại.
2. Thử các model thay thế: `gemini-2.0-flash-lite`, `gemini-1.5-flash-8b`, `gemini-pro`.
3. Cân nhắc sử dụng endpoint `v1` thay vì `v1beta` (nếu SDK hỗ trợ).
4. Nếu không thể khắc phục, có thể tắt hoàn toàn Gemini scoring — hệ thống vẫn chạy bình thường với `score_v1`.

### 3.2. Chấm điểm Gemini chưa bao giờ chạy thành công trên production

Do liên tiếp gặp lỗi 404 và 429, tính năng AI Scoring Vòng 2 chưa bao giờ thực sự hoạt động trong môi trường thực tế. Tuy nhiên, hệ thống vẫn trả kết quả ổn định nhờ cơ chế fallback.

---

## 4. Danh sách các file đã thay đổi

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `backend/api/ai_services.py` | **Viết lại toàn bộ** | Migration SDK, implement scoring-only strategy, retry thông minh, fallback |
| `backend/api/itinerary_optimizer.py` | **Sửa đổi** | Tách storytelling ra local (`_generate_ai_reason`), giảm `top_bonus` từ 20→10 |
| `backend/api/goong_service.py` | **Sửa đổi nhỏ** | Thêm logging cho AutoComplete response, `.strip()` cho API key |
| `backend/core/settings.py` | **Sửa đổi** | Đổi thứ tự load `.env`, thêm `override=True` |
| `backend/requirements.txt` | **Sửa đổi** | Thêm `google-genai` thay `google-generativeai` |
| `backend/.env` | **Cấu hình** | Thêm dòng `GEMINI_API_KEY=...` |
| `N09_TDTT/.env` (root) | **Đã xóa** | Xóa file trùng lặp gây xung đột biến môi trường |

---

## 5. Lưu ý kỹ thuật cho team

### Cách thay đổi Model Gemini

Nếu cần đổi sang model khác (ví dụ khi Google ra model mới), chỉ cần sửa **1 dòng duy nhất** trong file `backend/api/ai_services.py`:

```python
GEMINI_MODEL = 'gemini-1.5-flash'  # ← Thay bằng model mới tại đây
```

### Cách tắt hoàn toàn Gemini (nếu cần)

Xóa hoặc comment dòng `GEMINI_API_KEY` trong `backend/.env`. Hệ thống sẽ tự nhận biết và bỏ qua toàn bộ Gemini scoring.

### Cách test nhanh

```bash
cd backend && source ./venv/Scripts/activate && python manage.py runserver
```

Gõ tìm kiếm trên giao diện → Nếu terminal hiện `[Gemini] Scoring OK` → API hoạt động.  
Nếu hiện `[Gemini Scoring Error]` → API lỗi nhưng web vẫn chạy bình thường.

---

*Module này được thiết kế theo nguyên tắc **Graceful Degradation** — hệ thống luôn hoạt động ổn định bất kể API bên ngoài có khả dụng hay không.*
