## BÁO CÁO MODULE: QUẢN LÝ NGƯỜI DÙNG, BẢO MẬT & CÁ NHÂN HÓA (Auth, Security & User Profile)
## 1. Mục tiêu
- Xây dựng hệ thống định danh người dùng (Authentication) tập trung thay thế cho việc lưu trữ cục bộ (localStorage).

- Bảo mật các luồng giao tiếp giữa Frontend và Backend thông qua chuẩn token (JWT).

- Cung cấp giao diện quản lý hồ sơ cá nhân cho người dùng (đổi tên, mật khẩu).

- Tích hợp mượt mà dữ liệu Sở thích (Vibes) của người dùng vào giao diện để hỗ trợ hệ thống AI gợi ý lộ trình, đồng thời không làm gián đoạn các tính năng tương tác có sẵn của nhóm.

##  2. Tính năng chính đã triển khai
- Xác thực Firebase (Firebase Auth): Hỗ trợ Đăng ký, Đăng nhập bằng Email/Password và Đăng xuất.

- Bảo mật phiên (Session) bằng JWT: Tự động lấy IdToken từ Firebase làm JWT Bearer Token để xác thực các API request gửi lên Backend Django.

- Quản lý Hồ sơ cá nhân (Profile Modal): Giao diện dạng Popup (Modal) cho phép người dùng theo dõi Email, cập nhật Tên hiển thị (Display Name) và thay đổi Mật khẩu an toàn.

- Tích hợp UI Cá nhân hóa: Thanh Sidebar tự động thay đổi trạng thái theo thời gian thực (ẩn nút Đăng nhập, hiện Email/Avatar khi có user). Tự động fetch và hiển thị các "Thẻ sở thích" (Vibes) ngay khi đăng nhập thành công.

- Bảo mật mã nguồn: Triển khai quản lý biến môi trường qua file .env, ẩn toàn bộ các API Keys (Goong Map) và Base URL.

##  3. Files chính thay đổi và bổ sung
frontend/src/components/Sidebar.jsx (Cập nhật lớn)

- Thêm state quản lý user: user, userVibes, isProfileOpen.

- Sử dụng hook onAuthStateChanged để lắng nghe thay đổi phiên đăng nhập.

- Tích hợp hàm fetchUserVibes đính kèm header Authorization: Bearer <token>.

- Xử lý gộp code (merge) thành công với giao diện Câu hỏi AI (AIClarification) của team, đảm bảo 2 tính năng chạy song song mượt mà.

- Thêm hàm getApiBase() linh hoạt đọc từ biến môi trường.

frontend/src/components/ProfileModal.jsx (File mới)

- UI/UX hiển thị dạng modal overlay (chống làm gián đoạn bản đồ).

- Sử dụng các hàm updateProfile và updatePassword của Firebase.

- Xử lý validation: báo lỗi (mật khẩu ngắn, yêu cầu đăng nhập lại) và thông báo thành công.

frontend/src/components/Map/MapView.jsx (Cập nhật nhỏ)

- Chuyển goongjs.accessToken từ dạng hardcode sang đọc từ import.meta.env.VITE_GOONG_MAP_KEY.

.env (Bổ sung cấu hình)

- Khai báo các biến: VITE_API_BASE_URL, VITE_GOONG_MAP_KEY, VITE_GOONG_API_KEY.

## 4. Luồng xử lý nghiệp vụ & API
1. Người dùng tiến hành đăng nhập tại /login.

2. Firebase trả về đối tượng currentUser. Trình duyệt lưu trạng thái phiên.

3. Hook onAuthStateChanged trong Sidebar bắt được sự kiện có user.

4. Frontend gọi currentUser.getIdToken() để lấy chuỗi JWT.

5. Frontend gọi GET /api/profile/vibes/ kèm Header Authorization: Bearer <JWT>.

6. Backend Django giải mã JWT, xác thực danh tính và trả về danh sách Vibes tương ứng.

7. Frontend cập nhật state userVibes và render các thẻ sở thích lên giao diện.

## 5. Vấn đề kỹ thuật đã xử lý (Troubleshooting)
Xung đột mã nguồn (Merge Conflict) với Module AI:

- Vấn đề: Khi tích hợp code Firebase vào Sidebar, tính năng AIClarification (Câu hỏi phụ của AI) bị ghi đè/biến mất.

- Khắc phục: Tiến hành merge thủ công, phân tách rõ ràng khối State của Auth và State của AI. Giữ nguyên logic gọi /api/smart-itinerary/ của team.

Lỗi Invalid hook call (Trắng màn hình - White Screen):

- Vấn đề: Khai báo useState ngoài phạm vi Functional Component khiến React DOM crash khi render.

- Khắc phục: Di chuyển các khai báo state (isProfileOpen) vào đúng vùng cấp phát bên trong hàm export default function Sidebar.

Bảo mật Hardcode Key:

- Khắc phục: Đưa các giá trị nhạy cảm vào .env và hướng dẫn team sử dụng lệnh khởi động lại server (npm run dev) để Vite nhận diện biến môi trường mới.

## 6. Kết luận
Module Quản lý người dùng đã hoàn thành 100% mục tiêu đề ra, chính thức giải quyết hạn chế của việc lưu trữ tạm qua localStorage. Hệ thống hiện tại đã sẵn sàng cho môi trường Production với luồng xác thực bảo mật chặt chẽ bằng JWT và khả năng tùy biến cá nhân hóa toàn diện. Luồng dữ liệu giữa AI - Map - User đã hoàn toàn thông suốt.