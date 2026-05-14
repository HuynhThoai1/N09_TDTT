# 📄 Báo cáo Tiến độ — Tính năng Vibe Personalization

**Thực hiện bởi:** Đỗ Trung Kiên
**Ngày báo cáo:** 14/05/2026

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

> **Lưu ý kỹ thuật:** File `models.py` ban đầu import `User` nhầm từ `huggingface_hub`. Đã sửa sang dùng `settings.AUTH_USER_MODEL` để tránh xung đột với thư viện CLIP.

### 2.2 API — Thêm 2 endpoint mới (`views.py` + `urls.py`)
- **`GET /api/vibes/`:** Trả về toàn bộ thẻ sở thích, đã nhóm theo category, dùng cho modal Onboarding.
- **`GET/POST /api/profile/vibes/`:** Xem và lưu lựa chọn thẻ của người dùng. Có kiểm tra `is_authenticated` để tránh lỗi khi chưa đăng nhập.

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

### 3.1 Modal Chọn Sở Thích (`OnboardingPage.jsx`) — Cập nhật
Ban đầu được thiết kế là trang độc lập tại route `/onboarding`. Sau đó **chuyển sang dạng Modal** hiển thị đè lên trang chính để trải nghiệm mượt mà hơn:
- Background tối mờ (`backdrop-blur`) khi modal mở, trang chính vẫn hiển thị phía sau.
- Click ra ngoài modal để đóng.
- Tự động load lại thẻ đã chọn trước đó từ `localStorage` khi mở lại.
- Thẻ được nhóm theo category, hiển thị dạng pill button, chọn tối đa **5 thẻ**.
- Thẻ đã chọn highlight màu xanh với hiệu ứng glow.
- Có nút "Bỏ qua" và "Lưu sở thích".

### 3.2 Sidebar — Tích hợp Modal (`Sidebar.jsx`)
- Thêm mục **"Sở thích của bạn"** ở tab Lên kế hoạch.
- Hiển thị các thẻ đã chọn dạng pill màu xanh.
- Nút "✏️ Chỉnh sửa" mở Modal trực tiếp thay vì chuyển trang.
- Sau khi đóng Modal, Sidebar tự động cập nhật lại danh sách thẻ hiển thị.
- Khi gợi ý lộ trình, `prompt_text` tự động được nối thêm vibe context trước khi gửi lên backend:

```js
const vibeContext = userVibes.length > 0
    ? ". Ưu tiên: " + userVibes.map(v => v.label).join(", ")
    : "";

const payload = {
    stops: [...],
    prompt_text: goalText.trim() + vibeContext,
};
```

### 3.3 API Layer (`vibeApi.js`) — File mới
Do frontend (`localhost:5173`) và backend (`localhost:8000`) chạy khác domain, session cookie bị chặn bởi CORS. Giải pháp là lưu vibe bằng `localStorage` của trình duyệt thay vì session phía server:

- `getVibeTags()` — Lấy danh sách thẻ từ backend.
- `saveUserVibes(vibeIds)` — Lưu id và thông tin đầy đủ vào `localStorage`.
- `getUserVibes()` — Đọc lại từ `localStorage` để hiển thị trong Sidebar.

### 3.4 Router (`App.jsx`)
Giữ nguyên route `/onboarding` để tương thích, nhưng luồng chính hiện dùng Modal thay vì điều hướng trang.

---

## 4. Luồng dữ liệu hoàn chỉnh

```
Bấm "✏️ Chỉnh sửa" trong Sidebar
        ↓
Modal hiện ra, background tối mờ
        ↓
Chọn tối đa 5 thẻ sở thích → Bấm "Lưu sở thích"
        ↓
saveUserVibes() → Lưu vào localStorage
        ↓
Modal đóng → Sidebar tự cập nhật hiển thị thẻ mới
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

- **Lỗi import nhầm `User`:** File `models.py` ban đầu có sẵn dòng `from huggingface_hub import User` gây xung đột. Đã sửa sang `settings.AUTH_USER_MODEL`.
- **Lỗi CORS `credentials`:** Do khác domain, session cookie bị chặn. Đã chuyển sang `localStorage` ở frontend để tránh phụ thuộc session.
- **Lỗi `AnonymousUser` (HTTP 500):** Khi chưa đăng nhập, backend cố lưu `AnonymousUser` vào DB gây lỗi. Đã thêm kiểm tra `is_authenticated` trước khi thao tác DB.
- **Modal không load thẻ cũ:** Khi mở lại Modal, thẻ đã chọn trước đó bị reset. Đã xử lý bằng cách đọc `localStorage` trong `useEffect` khi `isOpen` thay đổi.

---

## 6. Hướng phát triển tiếp theo

- Tích hợp hệ thống **đăng ký / đăng nhập** để lưu vibe vào database thay vì `localStorage`.
- Mở rộng danh sách thẻ vibe ra các quận/khu vực khác ngoài Quận 1.
- Cho phép người dùng **đặt thứ tự ưu tiên** giữa các thẻ đã chọn.

---

*Báo cáo tiến độ nội bộ — Nhóm N09 — Tư duy tính toán.*
