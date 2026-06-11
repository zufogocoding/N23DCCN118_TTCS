const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const streamRoutes = require('./routes/streamRoutes.js')
const songRoutes = require('./routes/songRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const playlistRoutes = require('./routes/playlistRoutes.js');
const interactRoutes = require('./routes/interactRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');

const uploadRoutes = require('./routes/uploadRoutes');
const adminSongRoutes = require("./routes/adminSongRoutes");

const adminPlaylistRoutes = require("./routes/adminPlaylistRoutes");
const adminUserRoute = require("./routes/adminUserRoute");
const adminAlbumRoutes = require('./routes/adminAlbumRoutes.js');
const adminReportRoutes = require('./routes/adminReportRoutes.js');
const adminChartRoutes = require('./routes/adminChartRoutes.js');
const chartRoutes = require('./routes/chartRoutes.js');
const reportRoutes = require('./routes/reportRoutes.js');
const recommendationRoutes = require('./routes/recommendationRoutes.js');

const systemPlaylistRoutes = require('./routes/systemPlaylistRoutes.js');
const adminSystemPlaylistRoutes = require('./routes/adminSystemPlaylistRoutes.js');

const userRoutes = require('./routes/userRoutes.js');
const artistRequestRoutes = require('./routes/artistRequestRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');
const searchRoutes = require('./routes/searchRoutes.js');
const genreRoutes = require('./routes/genreRoutes.js');
const artistRoutes = require('./routes/artistRoutes.js');
const albumRoutes = require('./routes/albumRoutes.js');

const app = express()

// Restrict CORS to configured frontend origin only
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

// Rate limiting: strict limits on auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hello from PandaExpress')
})
// BUG FIX: Multer lưu file vào `./uploads/` (relative đến CWD = project root),
// nên cần serve static từ project root, không phải từ `server/uploads/`
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  // Tạo các thư mục con
  fs.mkdirSync(path.join(uploadsDir, 'songs'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'covers'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'banners'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'album-covers'), { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use(recommendationRoutes);
app.use(songRoutes);
app.use(streamRoutes);
app.use(authRoutes);
app.use(playlistRoutes);
app.use(interactRoutes);
app.use(dashboardRoutes);

app.use(uploadRoutes);
app.use(adminSongRoutes);

app.use(adminPlaylistRoutes);

app.use(adminAlbumRoutes);
app.use(adminReportRoutes);
app.use(adminChartRoutes);
app.use(chartRoutes);
app.use(reportRoutes);

app.use(systemPlaylistRoutes);
app.use(adminSystemPlaylistRoutes);


app.use('/api/users', userRoutes);
app.use('/api/admin/users', adminUserRoute);
app.use('/api/artist-requests', artistRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use(searchRoutes);
app.use(genreRoutes);
app.use(artistRoutes);
app.use(albumRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: "File quá lớn! Vui lòng chọn file nhỏ hơn." });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "Dữ liệu gửi lên không hợp lệ." });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Lỗi máy chủ nội bộ";

  res.status(statusCode).json({ error: message });
});

const startReleaseWorker = require('./workers/releaseWorker.js');
const { startMaintenanceWorker } = require('./workers/maintenanceWorker.js');

if (require.main === module) {
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`)
    startReleaseWorker();
    startMaintenanceWorker();
  });
}

module.exports = app;
