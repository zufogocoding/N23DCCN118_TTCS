const prisma = require('../db/index');
const fs = require('fs');
const path = require('path');

/**
 * Hàm thực hiện quét đĩa vật lý và xóa các file mồ côi (không được reference trong DB)
 */
async function runCleanup() {
  console.log('[Maintenance Worker] Khởi động tiến trình quét dọn tập tin mồ côi...');
  
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('[Maintenance Worker] Thư mục uploads không tồn tại.');
    return;
  }

  try {
    // ── 1. DỌN DẸP FILE NHẠC (uploads/songs) ──────────────────────────────────
    const songsDir = path.join(uploadsDir, 'songs');
    if (fs.existsSync(songsDir)) {
      const files = fs.readdirSync(songsDir);
      
      // Lấy toàn bộ danh sách audioUrl trong DB (từ bài hát và hồ sơ nghệ sĩ đang duyệt)
      const songsInDb = await prisma.song.findMany({
        select: { audioUrl: true }
      });
      const artistRequestsInDb = await prisma.artistRequest.findMany({
        select: { demoTrackUrl: true }
      });

      const activeAudioUrls = new Set([
        ...songsInDb.map(s => s.audioUrl),
        ...artistRequestsInDb.map(ar => ar.demoTrackUrl)
      ].filter(Boolean));

      let deletedSongsCount = 0;
      files.forEach(file => {
        // Hỗ trợ cả tương đối lẫn tuyệt đối khi so khớp
        const relativePath = `/uploads/songs/${file}`;
        if (!activeAudioUrls.has(relativePath)) {
          try {
            fs.unlinkSync(path.join(songsDir, file));
            deletedSongsCount++;
          } catch (err) {
            console.error(`[Maintenance Worker] Không thể xóa file ${file}:`, err.message);
          }
        }
      });
      console.log(`[Maintenance Worker] Dọn dẹp xong nhạc: Đã xóa ${deletedSongsCount} file mồ côi.`);
    }

    // ── 2. DỌN DẸP ẢNH BÌA (uploads/covers) ──────────────────────────────────
    const coversDir = path.join(uploadsDir, 'covers');
    if (fs.existsSync(coversDir)) {
      const files = fs.readdirSync(coversDir);

      // Lấy toàn bộ danh sách coverArtUrl từ Song, Album và Playlist
      const songCovers = await prisma.song.findMany({
        select: { coverArtUrl: true }
      });
      const albumCovers = await prisma.album.findMany({
        select: { coverArtUrl: true }
      });
      const playlistCovers = await prisma.playlist.findMany({
        select: { coverArtUrl: true }
      });

      const activeCoverUrls = new Set([
        ...songCovers.map(s => s.coverArtUrl),
        ...albumCovers.map(a => a.coverArtUrl),
        ...playlistCovers.map(p => p.coverArtUrl)
      ].filter(Boolean));

      let deletedCoversCount = 0;
      files.forEach(file => {
        const relativePath = `/uploads/covers/${file}`;
        if (!activeCoverUrls.has(relativePath)) {
          try {
            fs.unlinkSync(path.join(coversDir, file));
            deletedCoversCount++;
          } catch (err) {
            console.error(`[Maintenance Worker] Không thể xóa file ${file}:`, err.message);
          }
        }
      });
      console.log(`[Maintenance Worker] Dọn dẹp xong ảnh bìa: Đã xóa ${deletedCoversCount} file mồ côi.`);
    }
  } catch (error) {
    console.error('[Maintenance Worker] Gặp lỗi khi dọn dẹp:', error);
  }
}

/**
 * Khởi động Worker chạy tuần tự mỗi tiếng để kiểm tra điều kiện thời gian
 */
function startMaintenanceWorker() {
  console.log('⏳ Maintenance Worker đã bắt đầu chạy (lập lịch 2:00 sáng Chủ Nhật)...');

  // Chạy lần đầu khi start server (chỉ chạy kiểm tra điều kiện)
  setInterval(async () => {
    try {
      const now = new Date();
      const day = now.getDay(); // 0 = Chủ Nhật
      const hours = now.getHours();

      // Chỉ kích hoạt dọn dẹp vào khoảng 2h sáng Chủ Nhật
      if (day === 0 && hours === 2) {
        console.log('[Maintenance Worker] Đã đến 2:00 sáng Chủ Nhật. Tiến hành dọn dẹp hệ thống...');
        await runCleanup();
      }
    } catch (error) {
      console.error('[Maintenance Worker] Lỗi kiểm tra điều kiện dọn dẹp:', error);
    }
  }, 60 * 60 * 1000); // Mỗi giờ một lần
}

module.exports = {
  startMaintenanceWorker,
  runCleanup
};
