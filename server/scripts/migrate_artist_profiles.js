const prisma = require('../db/index');

async function migrateArtistProfiles() {
  console.log("=== BẮT ĐẦU DI CHUYỂN DỮ LIỆU PROFILE NGHỆ SĨ ===");
  try {
    // 1. Lấy toàn bộ danh sách nghệ sĩ và thông tin User tương ứng
    const artists = await prisma.artist.findMany({
      include: {
        user: true
      }
    });

    console.log(`Tìm thấy ${artists.length} nghệ sĩ trong cơ sở dữ liệu.`);

    let updatedCount = 0;

    // 2. Duyệt qua từng nghệ sĩ để sao chép dữ liệu sang User
    for (const artist of artists) {
      const user = artist.user;
      if (!user) {
        console.warn(`Cảnh báo: Artist với userId ${artist.userId} không có bản ghi User tương ứng.`);
        continue;
      }

      const updateData = {};
      let needsUpdate = false;

      // Sao chép bio nếu User chưa có nhưng Artist đã có
      if ((!user.bio || user.bio.trim() === "") && artist.artistBio) {
        updateData.bio = artist.artistBio;
        needsUpdate = true;
      }

      // Sao chép bannerUrl sang coverImageUrl nếu User chưa có nhưng Artist đã có
      if ((!user.coverImageUrl || user.coverImageUrl.trim() === "") && artist.bannerUrl) {
        updateData.coverImageUrl = artist.bannerUrl;
        needsUpdate = true;
      }

      // Sao chép avatarUrl nếu User chưa có nhưng Artist đã có
      if ((!user.avatarUrl || user.avatarUrl.trim() === "") && artist.avatarUrl) {
        updateData.avatarUrl = artist.avatarUrl;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`Đang đồng bộ dữ liệu cho User ID ${user.id} (${user.username})...`);
        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
        updatedCount++;
      }
    }

    console.log(`=== ĐỒNG BỘ HOÀN TẤT ===`);
    console.log(`Đã cập nhật profile cho ${updatedCount}/${artists.length} nghệ sĩ.`);
  } catch (error) {
    console.error("Lỗi xảy ra trong quá trình di chuyển dữ liệu:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateArtistProfiles();
