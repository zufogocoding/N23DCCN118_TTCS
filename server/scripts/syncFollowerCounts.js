const prisma = require('../db/index');

async function syncFollowerCounts() {
  console.log('=== BẮT ĐẦU ĐỒNG BỘ SỐ LƯỢNG NGƯỜI THEO DÕI NGHỆ SĨ ===');
  try {
    // 1. Lấy toàn bộ danh sách nghệ sĩ
    const artists = await prisma.artist.findMany({
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });

    console.log(`Tìm thấy ${artists.length} nghệ sĩ trong hệ thống.`);

    let updatedCount = 0;

    // 2. Với mỗi nghệ sĩ, đếm số follower thực tế trong bảng Follow
    for (const artist of artists) {
      const actualFollowers = await prisma.follow.count({
        where: {
          followeeId: artist.userId,
        },
      });

      const name = artist.user?.displayName || artist.user?.username || `ID ${artist.userId}`;

      if (artist.followerCount !== actualFollowers) {
        console.log(`- Nghệ sĩ "${name}": cập nhật followerCount từ ${artist.followerCount} -> ${actualFollowers}`);
        await prisma.artist.update({
          where: {
            userId: artist.userId,
          },
          data: {
            followerCount: actualFollowers,
          },
        });
        updatedCount++;
      } else {
        console.log(`- Nghệ sĩ "${name}": số lượng người theo dõi đã chuẩn khớp (${actualFollowers})`);
      }
    }

    console.log(`=== ĐỒNG BỘ HOÀN TẤT ===`);
    console.log(`Đã cập nhật số lượng follower cho ${updatedCount}/${artists.length} nghệ sĩ.`);
  } catch (error) {
    console.error('Lỗi trong quá trình đồng bộ số lượng người theo dõi:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncFollowerCounts();
