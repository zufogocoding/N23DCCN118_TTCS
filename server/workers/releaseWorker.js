const prisma = require('../db/index');

/**
 * Background worker to automatically publish scheduled albums when their release time arrives.
 */
function startReleaseWorker() {
  console.log('⏳ Release Worker đã bắt đầu chạy (chu kỳ 1 phút)...');

  setInterval(async () => {
    try {
      const now = new Date();
      // Find all scheduled albums that have reached their scheduledAt time
      const scheduledAlbums = await prisma.album.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: now,
          },
        },
      });

      if (scheduledAlbums.length > 0) {
        console.log(`[Release Worker] Tìm thấy ${scheduledAlbums.length} album đến hạn phát hành.`);

        for (const album of scheduledAlbums) {
          await prisma.album.update({
            where: { id: album.id },
            data: {
              status: 'released',
              releasedDate: now,
              scheduledAt: null,
            },
          });
          console.log(`[Release Worker] ✓ Album "${album.title}" (ID: ${album.id}) đã được phát hành thành công.`);
        }
      }
    } catch (error) {
      console.error('[Release Worker] Lỗi khi xử lý phát hành tự động:', error);
    }
  }, 60 * 1000); // 1 minute interval
}

module.exports = startReleaseWorker;
