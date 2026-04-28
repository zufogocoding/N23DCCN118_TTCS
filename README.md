```markdown
# N23DCCN118_TTCS - Backend API

Đồ án thực tập cơ sở của nhóm N23DCCN118. Đây là hệ thống Backend API (PERN stack) hỗ trợ quản lý người dùng và stream âm nhạc.

## Công nghệ sử dụng
* **Runtime:** Node.js
* **Framework:** Express.js (v5.x)
* **ORM:** Prisma (v7.x) với `@prisma/adapter-pg`
* **Cơ sở dữ liệu:** PostgreSQL
* **Xác thực:** JWT (JSON Web Token) & bcrypt
* **Containerization:** Docker & Docker Compose

## Yêu cầu môi trường
* Node.js (v18 trở lên)
* Docker & Docker Compose (để chạy cơ sở dữ liệu)

## Cài đặt và Khởi chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc của dự án và thêm các cấu hình sau:
```env
# Cấu hình kết nối Database tới Docker container
DATABASE_URL="postgresql://dummy:dummy@localhost:5433/dummy?schema=public"

# Chuỗi bí mật dùng để tạo JWT
JWT_SECRET="your_jwt_secret_key"
```

### 3. Khởi chạy Cơ sở dữ liệu (PostgreSQL)
Sử dụng Docker Compose để dựng container PostgreSQL:
```bash
docker compose up -d
```
*(Database sẽ chạy ở port 5433 trên máy host)*

### 4. Khởi tạo Database Schema
Đồng bộ cấu trúc bảng từ Prisma schema xuống cơ sở dữ liệu và tạo Prisma Client:
```bash
npx prisma db push
```

### 5. Khởi chạy Server
Chạy server trong môi trường phát triển (tự động cập nhật khi có thay đổi code và generate Prisma):
```bash
npm run dev
```
Server sẽ chạy tại: `http://localhost:9000`

---

## Danh sách API Endpoints

### Authentication
* **POST** `/api/auth/signup`
  * Body: `{ "username": "...", "email": "...", "password": "...", "dob": "YYYY-MM-DD", "country": "..." }`
  * Chức năng: Đăng ký tài khoản mới.
* **POST** `/api/auth/login`
  * Body: `{ "email": "...", "password": "..." }`
  * Chức năng: Đăng nhập và nhận JWT token.

### Songs
* **POST** `/api/songs/upload`
  * Type: `multipart/form-data`
  * Fields: `audioFile` (file MP3/WAV), `title` (text), `durationMs` (text)
  * Chức năng: Tải bài hát lên server vào thư mục `uploads/songs`.
* **GET** `/api/songs`
  * Chức năng: Lấy danh sách toàn bộ bài hát.
* **GET** `/api/songs/:id`
  * Chức năng: Lấy thông tin một bài hát cụ thể theo ID.
* **PUT** `/api/songs/:id`
  * Body: `{ "newTitle": "..." }`
  * Chức năng: Cập nhật tên bài hát.
* **DELETE** `/api/songs/:id`
  * Chức năng: Xóa thông tin bài hát khỏi database.

## Cấu trúc thư mục chính
* `/controllers` - Xử lý logic API (authController, songController).
* `/middlewares` - Middleware xử lý upload file (`uploadMiddleware.js`).
* `/routes` - Định nghĩa routing (`authRoutes.js`, `songRoutes.js`).
* `/prisma` - Chứa file `schema.prisma` và lịch sử migrations.
* `/db` - Cấu hình Prisma Client kết nối database bằng adapter-pg.
* `/uploads` - Thư mục lưu trữ file audio được upload.
```
