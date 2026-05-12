# 🚀 Tài liệu Nâng cấp Hệ thống AI Travel Planner

Tài liệu này tổng hợp toàn bộ các thay đổi về kiến trúc AI, thuật toán tìm kiếm và quy trình xử lý dữ liệu nhằm tối ưu hóa độ chính xác và tính cá nhân hóa cho ứng dụng.

---

## 1. Tổng quan các thay đổi (Changelog)

### ✅ Phase 1: AI Scoring & Reasoning (Gemini 3.1 Pro)
- **Nâng cấp:** Chuyển từ chấm điểm Text thô sang **Structured JSON Prompt**.
- **Tính năng mới:** AI không chỉ trả về điểm số (`score`) mà còn trả về **lý do giải thích** (`reason`) tại sao địa điểm đó phù hợp với sở thích người dùng.
- **Vị trí:** `backend/api/ai_services.py` -> Hàm `evaluate_routes_with_gemini`.

### ✅ Phase 2: Genetic Algorithm (GA) Optimization
- **Nâng cấp Fitness Function:** Tối ưu hóa đa mục tiêu (Multi-objective).
- **Diversity Bonus:** Thưởng điểm cho các lộ trình có sự kết hợp đa dạng (ví dụ: 1 điểm ẩm thực + 1 điểm tham quan + 1 điểm giải trí).
- **Cluster Penalty:** Phạt điểm nếu các địa điểm trong cùng 1 buổi quá gần nhau (< 1 phút di chuyển) để tránh gợi ý "vô lý".
- **Vị trí:** `backend/api/itinerary_optimizer.py` -> Hàm `_calculate_fitness`.

### ✅ Phase 3: Dual-Vector Search (SBERT + CLIP)
- **Nâng cấp:** Tích hợp mô hình **Vietnamese SBERT** (`keepitreal/vietnamese-sbert`) để hiểu ngữ nghĩa tiếng Việt chuyên sâu.
- **Hybrid Search:** Kết hợp trọng số giữa **Text Similarity (60%)** và **Visual Context (40% từ CLIP)**.
- **Database:** Thêm trường `text_vector` vào bảng `PointOfInterest` để lưu trữ vector hóa học máy.
- **Vị trí:** `backend/api/semantic_search.py`.

---

## 2. Kiến trúc Hệ thống hiện tại

Luồng xử lý dữ liệu (Pipeline) hoạt động như sau:

1. **User Prompt:** Người dùng nhập yêu cầu (VD: "Tìm quán cafe chill tối nay ở Quận 1").
2. **AI Gatekeeper:** Kiểm tra xem yêu cầu có đủ thông tin (địa điểm, thời gian, sở thích) chưa. Nếu thiếu sẽ hỏi ngược lại người dùng.
3. **Dual-Vector Retrieval:**
   - Sử dụng **SBERT** để tìm các địa điểm có mô tả/tên khớp về mặt ngữ nghĩa.
   - Sử dụng **CLIP** để tìm các địa điểm có vibe ảnh khớp với yêu cầu.
   - Trả về danh sách TOP ứng viên (Candidates).
4. **Genetic Algorithm (GA):**
   - Xếp sắp các ứng viên vào các khung giờ.
   - Tính toán quãng đường, thời gian di chuyển (Goong Maps API).
   - Áp dụng Diversity & Cluster Penalty để lọc ra lộ trình mượt nhất.
5. **Gemini Final Polish:**
   - Nhận lộ trình tối ưu nhất từ GA.
   - Viết lời giới thiệu cá nhân hóa và giải thích lý do chọn từng điểm.

---

## 3. Cấu trúc Database & Indexing

- **Cột mới:** `text_vector` (Vector 768 chiều từ SBERT).
- **Cơ chế Indexing:**
  - Để cập nhật lại toàn bộ vector khi có dữ liệu mới, bạn có thể sử dụng lệnh:
    ```bash
    python manage.py reindex_text_vectors
    ```
  - Hoặc sử dụng script độc lập `reindex_standalone.py` (đã tối ưu để tránh treo server).

---

## 4. Hướng dẫn vận hành & Mở rộng

### Cách nạp dữ liệu mới phù hợp:
Khi thêm một địa điểm (Point of Interest) mới vào Database, bạn nên cung cấp:
- **Tên (Name):** Rõ ràng.
- **Mô tả (Description):** Càng chi tiết về không gian, cảm giác (vibe) càng tốt.
- **Hình ảnh (Image):** Ảnh chất lượng cao để CLIP hoạt động chính xác.
- **Sau khi thêm:** Chạy lại lệnh `reindex` để cập nhật Vector tìm kiếm.

### Lưu ý về Tài nguyên:
- Các model AI (CLIP, SBERT) được nạp vào RAM ngay khi khởi động server (`api/apps.py`) bằng luồng chạy ngầm để không làm chậm request của người dùng.
- Cần tối thiểu **2-4GB RAM** trống để nạp các mô hình này mượt mà.

---
*Tài liệu được cập nhật tự động bởi Antigravity AI Assistant.*
