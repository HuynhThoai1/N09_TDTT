# 🗺️ Hệ thống Lên kế hoạch Hành trình Thông minh (AI Itinerary Planner)

Hệ thống ứng dụng trí tuệ nhân tạo để tự động hóa việc lên kế hoạch hành trình du lịch dựa trên **ý định người dùng (Intent-driven)**.

---

```text
N09_TDTT/
├── .vscode/                    # Cấu hình workspace cho VSCode
├── .gitignore                  # Cấu hình các file/thư mục không đưa lên Git
├── caodata.ipynb               # Script/Notebook dùng để cào dữ liệu
├── crawl_poi_images.py         # Script Python tải ảnh POI
├── docker-compose.yml          # Cấu hình Docker cho PostgreSQL và OSRM
├── package-lock.json           # File khóa phiên bản NPM tại root
├── readme.md                   # Tài liệu tổng quan và hướng dẫn dự án
├── ai_engine/                  # Thành phần AI: mô hình và thuật toán xử lý thông minh
│   └── (các module nội bộ)     # Tổ chức code AI theo chức năng
├── backend/                    # Máy chủ Django xử lý nghiệp vụ và cung cấp API
│   ├── manage.py               # Công cụ chạy server, migrate, tạo dữ liệu mẫu
│   ├── requirements.txt        # Danh sách thư viện Python cần cài
│   ├── db.sqlite3              # Cơ sở dữ liệu SQLite dùng cho môi trường test/dev
│   ├── api/                    # App API tổng hợp, đầu mối xử lý endpoint chung
│   ├── core/                   # Cấu hình trung tâm Django (settings, urls, wsgi, asgi)
│   ├── tours/                  # App quản lý tour, lịch trình, điểm đến
│   └── users/                  # App quản lý người dùng và xác thực
├── database/                   # Tài liệu dữ liệu: ERD, script SQL, mock data
│   └── (tài nguyên dữ liệu)    # Nơi lưu thiết kế và dữ liệu phục vụ phát triển
├── frontend/                   # Ứng dụng giao diện người dùng (ReactJS + Vite)
│   ├── src/                    # Mã nguồn chính: pages, components, services, hooks
│   ├── public/                 # Tài nguyên tĩnh: ảnh, icon, file public
│   ├── package.json            # Cấu hình npm scripts và dependencies
│   ├── vite.config.js          # Cấu hình Vite cho build/dev server
│   ├── eslint.config.js        # Cấu hình kiểm tra chất lượng mã nguồn frontend
│   ├── index.html              # File HTML gốc để mount ứng dụng React
│   └── README.md               # Hướng dẫn riêng cho phần frontend
├── osrm_data/                  # Dữ liệu map nội bộ dùng cho định tuyến OSRM
└── scripts/                    # Scripts hỗ trợ quản lý dự án
```


## 🚀 Tính năng nổi bật

- **Tìm kiếm Ngữ nghĩa (Semantic Search):** Sử dụng mô hình **CLIP (ViT-B-32)** để hiểu nhu cầu người dùng.
- **Tối ưu hóa hành trình:** Giải thuật **Di truyền (Genetic Algorithm)** giúp tìm lộ trình tối ưu nhất.
- **Đề xuất Đa dạng:** Cung cấp 3 phương án hành trình: *Tinh túy*, *Ẩm thực & Thư giãn*, và *Khám phá & Trải nghiệm*.
- **Định tuyến Thực tế (Local GIS):** Tích hợp engine **OSRM cục bộ** để tính toán thời gian chính xác.
- **Lưu trữ Vector:** Sử dụng mở rộng **pgvector** trên PostgreSQL để truy vấn cực nhanh.

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** React.js (Vite), Leaflet Map, Lucide Icons.
- **Backend:** Django Rest Framework, PyTorch (CLIP), OSRM API.
- **Infrastructure:** Docker & Docker Compose (PostgreSQL 16 + pgvector).

---

## ⚙️ Hướng dẫn cài đặt & Khởi chạy (Dành cho Team)

Để chạy dự án này, bạn cần thực hiện theo các bước sau:

### Bước 1: Khởi tạo hạ tầng (Docker)
Đảm bảo bạn đã cài Docker Desktop, sau đó tại thư mục gốc chạy lệnh:
```bash
docker-compose up -d
```
*Lệnh này sẽ khởi động PostgreSQL (pgvector) và OSRM Engine (Cổng 5000).*

### Bước 2: Thiết lập dữ liệu nặng từ Drive
Vì các file bản đồ và dữ liệu ảnh rất nặng, bạn hãy tải từ Link Drive sau:
- **Link Drive:** [Tải tại đây](https://drive.google.com/drive/folders/1Tr-oR9hALMCJf4J4a1lRFun6iiOCzWXv?usp=drive_link)

**Hướng dẫn giải nén:**
1. File `osrm_data.zip`: Giải nén thư mục `osrm_data` bỏ vào **thư mục gốc** dự án (ngang hàng với `docker-compose.yml`).
2. File `media.zip`: Giải nén thư mục `media` bỏ vào bên trong thư mục **`backend/`**.

---

### Bước 3: Cấu hình và Chạy Backend (Django)
Mở terminal tại thư mục dự án và thực hiện chi tiết các bước sau:
1. Di chuyển vào thư mục backend: `cd backend`
2. Kích hoạt môi trường ảo (Windows): `source ./venv/Scripts/activate` (nếu sử dụng venv)
3. Cài đặt thư viện cho dự án: `pip install -r requirements.txt`
   *(Lưu ý: File này đã bao gồm đầy đủ thư viện `sentence-transformers` dùng cho AI NLP)*
4. Khởi tạo cấu trúc Database (Migration):
   ```bash
   python manage.py migrate
   ```
5. **(Quan trọng) Import dữ liệu địa điểm vào Database:** Ở các phiên bản trước hệ thống dùng file `pois_auto_v2.json`, nhưng hiện tại chúng ta đã thống nhất dùng file dữ liệu đầy đủ vector là `district1_full_data.json`. Chạy lệnh sau để load:
   ```bash
   python manage.py import_pois --clear district1_full_data.json
   ```
   *(Cờ `--clear` giúp tự động dọn sạch rác trong DB và thay thế bằng tập dữ liệu chuẩn này, đảm bảo ai cấu hình cũng ra cùng 1 source data giống nhau)*
6. Khởi chạy server: 
   ```bash
   python manage.py runserver
   ```
   *(Lưu ý nhỏ: Ở lần gọi lộ trình AI đầu tiên, ứng dụng sẽ tải model CLIP từ HuggingFace nặng khoảng hơn 600MB nên có thể mạng cần ổn định, tránh đứt đoạn báo lỗi trả về 1 route.)*

### Bước 4: Khởi động Frontend (React)
Mở một terminal khác:
1. Di chuyển vào thư mục frontend: `cd frontend`
2. Cài đặt thư viện (nếu mới tải lần đầu): `npm install`
3. Khởi chạy: `npm run dev`

---

## 📸 Hình ảnh minh họa & Giao diện

Hệ thống cung cấp giao diện trực quan với các công cụ quản lý Docker và bản đồ:

### 1. Quản lý Docker
Cài docker desktop về máy.
Bạn có thể quản lý các Service trong Docker extension hoặc qua Dashboard:

![Ảnh docker extension](./docker_extension.png)
Thoát ra vào lại vscode.
![Ảnh chạy docker_compose](./docker_compose.png)
*(Nhấn Run All Service để khởi động toàn bộ hệ thống)*

---

## 💡 Hướng dẫn sử dụng nhanh
1. **Vị trí bắt đầu:** Click chọn một địa điểm trên bản đồ hoặc tìm kiếm và nhấn **Chọn**.
2. **Nhập ý định:** Nhập nhu cầu của bạn (VD: "Đi ăn tối lãng mạn") vào ô kế hoạch.
3. **Gợi ý:** Nhấn nút **"Gợi ý lộ trình"** và chờ AI xử lý trong vài giây.
4. **Kết quả:** Xem 3 phương án tại tab **Kết quả** và nhấn vào từng lộ trình để xem đường đi trên bản đồ.

---

## 📝 Tài liệu bổ sung
- [Hướng dẫn Thuyết trình Kỹ thuật](./technical_presentation_guide.md)
- [Hướng dẫn Cài đặt OSRM nâng cao](./SETUP_OSRM.md)
