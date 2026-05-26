# 🎶 SoundClown - Music Streaming & Recommendation Platform

Đồ án thực tập cơ sở của nhóm **N23DCCN118**. Hệ thống streaming âm nhạc hiện đại, kết hợp mạng xã hội chia sẻ nhạc và hệ thống gợi ý bài hát cá nhân hóa thông minh (Hybrid Recommendation Engine).

---

## 🚀 Điểm Nổi Bật của Dự Án

- **Streaming & Sharing**: Hỗ trợ upload nhạc (MP3/WAV), phân loại thể loại, quản lý danh sách phát (Playlist), Album và theo dõi nghệ sĩ (Artist).
- **Hệ Thống Gợi Ý Hybrid**:
  - **Collaborative Filtering (ALS)**: Thuật toán Implicit Alternating Least Squares (ALS) phân tích hành vi người dùng (completion rate, skips, likes) để tìm ra các track phù hợp.
  - **Content-Based Filtering (pgvector)**: Sử dụng DSP (Digital Signal Processing) qua thư viện Librosa để phân tích nhịp điệu (Tempo), năng lượng (Energy) và độ sôi động (Danceability) của bài hát thành các vector đặc trưng 128 chiều.
  - **Vector Search**: Sử dụng cơ sở dữ liệu tích hợp extension `pgvector` giúp tìm kiếm bài hát tương đồng hoặc gợi ý cho người dùng với hiệu năng tối ưu.

---

## 🛠️ Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|---|---|
| **Frontend (Client)** | React 19, Vite, Tailwind CSS v4, Axios, React Router v7, React Hook Form, Recharts, Lucide Icons |
| **Backend (Server)** | Node.js, Express.js (v5.x), Prisma ORM (v7.x), `@prisma/adapter-pg`, Multer, Nodemailer, JWT |
| **ML-Service (AI/ML)** | Python 3.11+, FastAPI, Uvicorn, Implicit (ALS), Librosa, Soundfile, Pandas, Scipy |
| **Database** | PostgreSQL 16 với extension `pgvector` (`pgvector/pgvector:pg16`) |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
N23DCCN118_TTCS/
├── client/                     # Frontend (React 19, Vite, Tailwind CSS)
│   ├── src/                    # Mã nguồn giao diện
│   │   ├── app/                # Cấu hình app & routing
│   │   ├── components/         # Các UI component dùng chung
│   │   └── ...                 # Views, Hooks, Services
│   ├── package.json            # Thư viện frontend
│   └── vite.config.js          # Cấu hình build Vite
│
├── server/                     # Backend API & ML Recommendation
│   ├── compose.yaml            # Cấu hình Docker Compose (Backend, ML API, PostgreSQL)
│   ├── dockerfile              # Dockerfile build Express server
│   ├── controllers/            # Logic xử lý API (Auth, Song, Playlist, Artist, Reports...)
│   ├── routes/                 # Định nghĩa các REST API endpoint
│   ├── middlewares/            # Middleware xác thực JWT, upload file (Multer)
│   ├── workers/                # Các tiến trình nền (như tự động phát hành album)
│   ├── prisma/                 # Schema Prisma và các file migration
│   │   └── schema.prisma       # Định nghĩa CSDL & pgvector columns
│   ├── manage-db.js            # Script quản trị, hỗ trợ seed & dọn dẹp database
│   ├── server.js               # File chạy chính của Express server
│   │
│   ├── ml-service/             # FastAPI Recommendation & DSP Analysis
│   │   ├── Dockerfile          # Dockerfile build python service
│   │   ├── requirements.txt    # Danh sách thư viện Python
│   │   ├── main.py             # Entrypoint khởi động Uvicorn
│   │   └── app/                # Logic tính toán vector & gợi ý
│   │       ├── main.py         # Các Router endpoint (FastAPI)
│   │       ├── services/       # Training ALS & recommendation query logic
│   │       └── utils/          # DSP audio properties analysis (Librosa)
│   │
│   └── uploads/                # Thư mục lưu trữ tĩnh (nhạc, ảnh bìa, avatar...)
└── README.md                   # Tài liệu hướng dẫn dự án
```

---

## 🔧 Yêu Cầu Hệ Thống

- **Docker & Docker Compose** (Khuyên dùng để cài đặt môi trường cơ sở dữ liệu nhanh chóng).
- **Node.js v20+** & **npm** (Nếu chạy thủ công ở local).
- **Python 3.10+** (Nếu chạy thủ công dịch vụ ML ở local).

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Docker Compose)

Cách tốt nhất để chạy toàn bộ hệ thống (Database pgvector, Express Server, và ML API) là sử dụng Docker Compose. Giao diện Client (Vite) sẽ được chạy thủ công ở máy host.

### Bước 1: Clone dự án
```bash
git clone https://github.com/zufogocoding/N23DCCN118_TTCS.git
cd N23DCCN118_TTCS
```

### Bước 2: Thiết lập cấu hình biến môi trường
Tạo file `.env` tại thư mục `server/`:
```bash
cp server/.env.example server/.env
```
Cấu hình mẫu mặc định đã bao gồm kết nối CSDL và các khoá bí mật:
```env
DB_USER=krock_on_socks
DB_PASSWORD=TrongTuanQuynnhTTCS
DB_NAME=soundclown
DB_HOST=db
DATABASE_URL="postgresql://krock_on_socks:TrongTuanQuynnhTTCS@localhost:5433/soundclown?schema=public"
JWT_SECRET="PandaExpress_Secret_Key_123!@#"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

### Bước 3: Khởi chạy các container bằng Docker Compose
Di chuyển vào thư mục `server` và chạy lệnh build:
```bash
cd server
docker compose up -d --build
```
Lệnh này sẽ khởi tạo 3 container dịch vụ:
1. `db`: Khởi tạo PostgreSQL 16 có sẵn extension `pgvector` chạy trên port `5433`.
2. `ml-api`: Dịch vụ gợi ý FastAPI chạy trên port `8000`.
3. `backend`: Express API chạy trên port `9000`.

### Bước 4: Đồng bộ CSDL và tạo Prisma Client
Chạy lệnh push schema trực tiếp lên PostgreSQL container:
```bash
# Ở thư mục server/ trên máy host
npx prisma db push
```

### Bước 5: Chạy Client (React + Vite)
Mở một terminal mới, chuyển đến thư mục `client/` và thực hiện cài đặt:
```bash
cd ../client
npm install
npm run dev
```
Trình duyệt sẽ tự động mở giao diện ứng dụng tại: `http://localhost:5173`.

---

## 🛠️ Hướng Dẫn Chạy Thủ Công (Không Docker)

### 1. Cài đặt CSDL PostgreSQL & pgvector
Bạn cần cài đặt PostgreSQL (v15+) trên máy và kích hoạt extension `pgvector` bằng cách biên dịch hoặc cài gói tương ứng.
Tạo database có tên `soundclown` và chạy câu lệnh trong sql shell:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Chạy Express Backend
```bash
cd server
npm install
# Cập nhật DATABASE_URL trong file .env trỏ về CSDL local của bạn
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Chạy Dịch Vụ ML (Python FastAPI)
```bash
cd server/ml-service
python -m venv venv
source venv/bin/activate # Trên Windows dùng: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## 📊 Mô Hình Gợi Ý Hybrid Recommendation

Hệ thống gợi ý hoạt động dựa trên sự kết hợp giữa hành vi người dùng và phân tích dữ liệu âm thanh thực tế:

```mermaid
flowchart TD
    A[Người dùng tương tác: Nghe, Like, Skip] -->|Ghi nhận Interaction| B[(CSDL PostgreSQL)]
    C[Nghệ sĩ upload nhạc mới] -->|Lưu file nhạc .mp3| D[Hệ thống Multer]
    D -->|Kích hoạt phân tích âm thanh| E[ML API: Librosa DSP]
    E -->|Trích xuất: Tempo, Energy, Danceability| F[Tạo Vector Đặc Trưng 128-dim]
    F -->|Lưu vào Song.contentVector| B
    
    subgraph Huấn luyện mô hình ngầm
        B -->|Đọc ma trận tương tác & vector bài hát| G[ML API: Train Pipeline]
        G -->|Implicit ALS| H[Cập nhật Collaborative Vectors cho User & Song]
        H -->|Lưu vectors| B
    end
    
    subgraph Trình gợi ý
        B -->|Tính toán similarity qua Euclidean/Cosine| I[Gợi ý Hybrid]
        I -->|Trả kết quả| J[Client App: Recommend for User / Similar Songs]
    end
```

1. **DSP Audio Feature Analysis**:
   - Khi bài hát được tải lên, hệ thống gọi dịch vụ Python để sử dụng thư viện `librosa` phân tích tín hiệu số (DSP).
   - Trích xuất: Tốc độ nhạc (`tempo`), độ mạnh mẽ/năng lượng (`energy`) và nhịp điệu dễ nhảy (`danceability`).
   - Các giá trị này được chuẩn hóa và lưu thành vector 128 chiều (`contentVector`) trong cột kiểu `vector` của PostgreSQL.

2. **Implicit ALS Collaborative Filtering**:
   - Người dùng thực hiện các hành động nghe nhạc, hệ thống lưu lại tỷ lệ hoàn thành (`completionRate`), lượt nhấn skip (`isSkipped`), lượt yêu thích (`isLiked`).
   - Mô hình Collaborative Filtering sử dụng ma trận tương tác ngầm (Implicit feedback) để huấn luyện ra các latent factors cho User và Song (64 chiều).

3. **Hybrid Matching**:
   - Kết quả gợi ý cuối cùng cho mỗi người dùng được tính toán dựa trên khoảng cách vector giữa sở thích người dùng và đặc trưng âm nhạc của bài hát, lưu vào `RecommendationCache` để truy xuất nhanh.

---

## 🌐 Các Endpoint API Quan Trọng

### 🔑 Xác Thực (Authentication)
- **POST** `/api/auth/signup`: Đăng ký tài khoản người dùng mới.
- **POST** `/api/auth/login`: Đăng nhập hệ thống và nhận mã JWT token.
- **POST** `/api/auth/verify-otp`: Xác thực mã OTP được gửi qua Email.

### 🎵 Quản Lý Bài Hát (Songs)
- **POST** `/api/songs/upload`: Đăng tải bài hát (chấp nhận file audio & ảnh bìa).
- **GET** `/api/songs`: Xem danh sách bài hát công khai.
- **GET** `/api/songs/:id`: Chi tiết bài hát.
- **DELETE** `/api/songs/:id`: Xoá bài hát.

### 🧠 Dịch Vụ Machine Learning (ML API - Port 8000)
- **POST** `/train`: Kích hoạt tiến trình huấn luyện mô hình Collaborative Filtering ALS.
- **GET** `/train/status`: Kiểm tra trạng thái tiến trình huấn luyện.
- **GET** `/recommend/:userId`: Lấy danh sách bài hát gợi ý cá nhân hóa cho người dùng.
- **GET** `/recommend/songs/:songId/similar`: Lấy danh sách các bài hát tương đồng về tiết tấu và năng lượng với bài hát hiện tại.

### 🛡️ Quản Trị Viên (Admin)
- **GET** `/api/admin/users`: Danh sách và quản lý trạng thái tài khoản.
- **GET** `/api/artist-requests`: Duyệt hoặc từ chối các yêu cầu trở thành nghệ sĩ từ người dùng thông thường.
- **GET** `/api/admin/reports`: Quản lý báo cáo vi phạm bản quyền hoặc nội dung xấu từ người dùng gửi lên.
