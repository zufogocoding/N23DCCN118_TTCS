const prisma = require('../db/index');
const { notifyFollowersAboutAlbumRelease } = require('../services/notificationService');

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
        include: {
          artist: true,
          songs: {
            include: {
              song: true,
            },
          },
        },
      });

      if (scheduledAlbums.length > 0) {
        console.log(`[Release Worker] Tìm thấy ${scheduledAlbums.length} album đến hạn phát hành.`);

        for (const album of scheduledAlbums) {
          // 1. Kiểm tra nghệ sĩ hoạt động
          if (!album.artist || album.artist.status !== 'active') {
            console.log(`[Release Worker] ⚠️ Nghệ sĩ của album "${album.title}" (ID: ${album.id}) không hoạt động. Hoàn tác về draft.`);
            await prisma.album.update({
              where: { id: album.id },
              data: {
                status: 'draft',
                scheduledAt: null,
              },
            });
            continue;
          }

          // 2. Kiểm tra tất cả bài hát được duyệt
          const allSongs = album.songs.map(as => as.song).filter(Boolean);
          const unapprovedSongs = allSongs.filter(song => song.status !== 'approved' || song.isDeleted);

          if (unapprovedSongs.length > 0 || allSongs.length === 0) {
            console.log(`[Release Worker] ⚠️ Album "${album.title}" (ID: ${album.id}) chứa bài hát chưa được duyệt hoặc rỗng. Hoàn tác về draft.`);
            await prisma.album.update({
              where: { id: album.id },
              data: {
                status: 'draft',
                scheduledAt: null,
              },
            });
            continue;
          }

          const notificationCount = await prisma.$transaction(async (tx) => {
            await tx.album.update({
              where: { id: album.id },
              data: {
                status: 'released',
                releasedDate: now,
                scheduledAt: null,
              },
            });
            return notifyFollowersAboutAlbumRelease(tx, album.id);
          });
          console.log(`[Notification] Created ${notificationCount} new_album notifications for scheduled album ${album.id}`);
          console.log(`[Release Worker] ✓ Album "${album.title}" (ID: ${album.id}) đã được phát hành thành công.`);
        }
      }
    } catch (error) {
      console.error('[Release Worker] Lỗi khi xử lý phát hành tự động:', error);
    }
  }, 60 * 1000); // 1 minute interval
}

module.exports = startReleaseWorker;
