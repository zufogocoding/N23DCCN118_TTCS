const express = require('express');
const cors = require('cors');
const path = require('path');

const streamRoutes = require('./routes/streamRoutes.js')
const songRoutes = require('./routes/songRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const playlistRoutes = require('./routes/playlistRoutes.js');
const interactRoutes = require('./routes/interactRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
 
const uploadRoutes = require('./routes/uploadRoutes');
const adminSongRoutes = require("./routes/adminSongRoutes");
const adminPlaylistRoutes = require("./routes/adminPlaylistRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");

const userRoutes = require('./routes/userRoutes.js');
const artistRequestRoutes = require('./routes/artistRequestRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');
const searchRoutes = require('./routes/searchRoutes.js');
const genreRoutes = require('./routes/genreRoutes.js');
const artistRoutes = require('./routes/artistRoutes.js');
const albumRoutes = require('./routes/albumRoutes.js');
 
const app = express()

app.use(cors()); // Cho phép Frontend gọi API 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello from PandaExpress')
})
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(songRoutes);
app.use(streamRoutes);
app.use(authRoutes);
app.use(playlistRoutes);
app.use(interactRoutes);
app.use(dashboardRoutes);
 
app.use(uploadRoutes);
app.use(adminSongRoutes);
app.use(adminPlaylistRoutes);
app.use(adminUserRoutes);

app.use('/api/users', userRoutes);
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
  res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ" });
});

const startReleaseWorker = require('./workers/releaseWorker.js');

app.listen(9000, '0.0.0.0', () => {
  console.log('The server is now live and pretty much acessable')
  startReleaseWorker();
})
