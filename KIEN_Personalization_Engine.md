# 📄 Báo cáo Tiến độ — Tính năng Vibe Personalization

**Thực hiện bởi:** Đỗ Trung Kiên
**Ngày báo cáo:** 04/05/2026

Dự án đã hoàn thành giai đoạn bổ sung tính năng mới: **Hệ thống Vibe Personalization** — cho phép người dùng thiết lập sở thích cá nhân để AI tự động điều chỉnh gợi ý lộ trình phù hợp hơn.

---

## 1. Tổng quan tính năng

Thay vì AI chỉ dựa vào câu nhập của người dùng, hệ thống nay cho phép người dùng **chọn trước các thẻ sở thích** (Vibe Tags). Khi gợi ý lộ trình, AI sẽ tự động tích hợp các sở thích này vào quá trình tìm kiếm ngữ nghĩa mà người dùng không cần nhập thêm gì.

**Ví dụ thực tế:**
- Người dùng chọn thẻ *"Đam mê Lịch sử"* + *"Thích yên tĩnh"*
- Gõ: *"Tôi muốn đi dạo Quận 1"*
- AI tự động hiểu: *"Tôi muốn đi dạo Quận 1. Ưu tiên: di tích lịch sử, bảo tàng, kiến trúc cổ, yên tĩnh"*
- Kết quả ưu tiên: Dinh Độc Lập, Bưu Điện Trung Tâm thay vì các quán Pub ồn ào.

---

## 2. Các thay đổi Backend (Django)

### 2.1 Database — Thêm 2 model mới (`models.py`)
- **`VibeTag`:** Lưu danh sách thẻ sở thích, chia thành 5 nhóm: Không gian, Ẩm thực, Văn hóa & Lịch sử, Hoạt động, Thời điểm. Mỗi thẻ có trường `prompt_keyword` bí mật dùng để nối vào AI prompt.
- **`UserProfile`:** Lưu hồ sơ người dùng, quan hệ nhiều-nhiều với `VibeTag` thông qua Django `ManyToManyField`.

### 2.2 API — Thêm 2 endpoint mới (`views.py` + `urls.py`)
- **`GET /api/vibes/`:** Trả về toàn bộ thẻ sở thích, đã nhóm theo category, dùng cho màn hình Onboarding.
- **`GET/POST /api/profile/vibes/`:** Xem và lưu lựa chọn thẻ của người dùng.

### 2.3 Tích hợp AI Prompt (`views.py`)
Hàm `_build_prompt_with_vibes()` được thêm vào, tự động lấy sở thích từ database và nối bí mật vào `prompt_text` trước khi gọi CLIP Semantic Search:

```python
def _build_prompt_with_vibes(user, prompt_text):
    vibe_context = user.profile.get_prompt_context()
    if vibe_context:
        return f"{prompt_text}. {vibe_context}"
    return prompt_text
```

### 2.4 Seed Data — Dữ liệu mẫu
- Tạo file `backend/data/vibe_tags_seed.json` với 13 thẻ sở thích mẫu.
- Viết management command `import_vibes` để import dữ liệu (tương tự `import_pois` đã có).

---

## 3. Các thay đổi Frontend (React + Vite)

### 3.1 Màn hình Onboarding (`OnboardingPage.jsx`) — File mới
Màn hình hiển thị ngay sau khi đăng ký, cho phép người dùng chọn tối đa **5 thẻ sở thích**:
- Thẻ được nhóm theo category, hiển thị dạng pill button.
- Thẻ đã chọn được highlight màu xanh.
- Có nút "Bỏ qua, làm sau" để người dùng không bắt buộc phải chọn.

### 3.2 Sidebar — Hiển thị sở thích (`Sidebar.jsx`)
- Thêm mục **"Sở thích của bạn"** ở tab Lên kế hoạch.
- Hiển thị các thẻ đã chọn dạng pill màu xanh.
- Có nút "✏️ Chỉnh sửa" để quay lại màn hình Onboarding.
- Khi gợi ý lộ trình, `prompt_text` tự động được nối thêm vibe context trước khi gửi lên backend.

### 3.3 API Layer (`vibeApi.js`) — File mới
Tách riêng các hàm gọi API liên quan đến vibe:
- `getVibeTags()` — Lấy danh sách thẻ từ backend.
- `saveUserVibes(vibeIds)` — Lưu lựa chọn vào `localStorage`.
- `getUserVibes()` — Đọc lại từ `localStorage` để hiển thị trong Sidebar.

### 3.4 Router (`App.jsx`)
Thêm route `/onboarding` trỏ đến `OnboardingPage`.

---

## 4. Luồng dữ liệu hoàn chỉnh

```
Người dùng vào /onboarding
        ↓
Chọn tối đa 5 thẻ sở thích → Lưu vào localStorage
        ↓
Vào trang chính → Sidebar đọc localStorage → Hiển thị thẻ đã chọn
        ↓
Người dùng nhập yêu cầu + bấm "Gợi ý lộ trình"
        ↓
Frontend nối vibe vào prompt_text → Gửi lên /api/smart-itinerary/
        ↓
CLIP Semantic Search với prompt đã được cá nhân hóa
        ↓
Genetic Algorithm → Trả về 3 lộ trình phù hợp hơn
```

---

## 5. Các vấn đề kỹ thuật đã xử lý

- **Lỗi import nhầm `User`:** File `models.py` ban đầu import `User` từ `huggingface_hub` thay vì Django. Đã sửa sang dùng `settings.AUTH_USER_MODEL`.
- **Lỗi CORS `credentials`:** Do frontend và backend chạy khác domain (`5173` vs `8000`), session cookie bị chặn. Đã chuyển sang lưu vibe bằng `localStorage` ở frontend để tránh phụ thuộc session.
- **Lỗi `AnonymousUser`:** Khi chưa đăng nhập, backend cố lưu `AnonymousUser` vào DB gây lỗi 500. Đã thêm kiểm tra `is_authenticated` trước khi thao tác DB.

---

## 6. Hướng phát triển tiếp theo

- Tích hợp hệ thống **đăng ký / đăng nhập** để lưu vibe vào database thay vì `localStorage`.
- Mở rộng danh sách thẻ vibe ra các quận/khu vực khác ngoài Quận 1.
- Cho phép người dùng **đặt thứ tự ưu tiên** giữa các thẻ đã chọn.

---

*Báo cáo tiến độ nội bộ — Nhóm N09 — Tư duy tính toán.*