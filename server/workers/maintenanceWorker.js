const prisma = require('../db/index');
const fs = require('fs');
const path = require('path');

/**
 * Hàm thực hiện quét đĩa vật lý và xóa các file mồ côi (không được reference trong DB)
 */
async function runCleanup() {
  console.log('[Maintenance Worker] Khởi động tiến trình quét dọn tập tin mồ côi...');
  
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const privateUploadsDir = path.resolve(process.cwd(), 'private_uploads');

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

    // ── 3. DỌN DẸP ẢNH ID CARD BẢO MẬT (private_uploads/id_cards) ──────────────
    const idCardsDir = path.join(privateUploadsDir, 'id_cards');
    if (fs.existsSync(idCardsDir)) {
      const files = fs.readdirSync(idCardsDir);

      const artistRequestsInDb = await prisma.artistRequest.findMany({
        select: { idCardUrl: true }
      });

      const activeIdCardUrls = new Set(artistRequestsInDb.map(ar => ar.idCardUrl).filter(Boolean));

      let deletedIdCardsCount = 0;
      files.forEach(file => {
        const relativePath = `/private_uploads/id_cards/${file}`;
        if (!activeIdCardUrls.has(relativePath)) {
          try {
            fs.unlinkSync(path.join(idCardsDir, file));
            deletedIdCardsCount++;
          } catch (err) {
            console.error(`[Maintenance Worker] Không thể xóa file ID Card ${file}:`, err.message);
          }
        }
      });
      console.log(`[Maintenance Worker] Dọn dẹp xong ID Card: Đã xóa ${deletedIdCardsCount} file mồ côi.`);
    }
  } catch (error) {
    console.error('[Maintenance Worker] Gặp lỗi khi dọn dẹp:', error);
  }
}

/**
 * Lập lịch chạy dọn dẹp tiếp theo với tính toán độ trễ chính xác
 */
function scheduleNextCleanup() {
  const now = new Date();
  const nextSunday = new Date();
  
  // Lập lịch vào 2:00 sáng Chủ Nhật gần nhất
  nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
  nextSunday.setHours(2, 0, 0, 0);

  // Nếu thời điểm đó đã qua trong tuần này, cộng thêm 7 ngày
  if (nextSunday <= now) {
    nextSunday.setDate(nextSunday.getDate() + 7);
  }

  const delayMs = nextSunday.getTime() - now.getTime();
  console.log(`[Maintenance Worker] Lập lịch dọn dẹp tiếp theo vào: ${nextSunday.toLocaleString()} (sau ${Math.round(delayMs / 1000 / 60)} phút).`);

  setTimeout(async () => {
    try {
      console.log('[Maintenance Worker] Bắt đầu dọn dẹp định kỳ theo thời gian đã lập...');
      await runCleanup();
    } catch (error) {
      console.error('[Maintenance Worker] Lỗi dọn dẹp định kỳ:', error);
    } finally {
      scheduleNextCleanup();
    }
  }, delayMs);
}

/**
 * Khởi động Worker chạy với thời gian định trước chính xác
 */
function startMaintenanceWorker() {
  console.log('⏳ Maintenance Worker đã khởi chạy (chế độ tính toán chính xác)...');
  scheduleNextCleanup();
}

module.exports = {
  startMaintenanceWorker,
  runCleanup
};
