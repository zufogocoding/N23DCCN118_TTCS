require('dotenv').config();
const prisma = require('./db/index.js');

async function seedInteractions() {
  console.log('\n🏷️ Bắt đầu tạo dữ liệu lượt nghe giả (Fake Interactions)...\n');

  try {
    // 1. Lấy danh sách user và song hiện có
    const users = await prisma.user.findMany({ select: { id: true } });
    const songs = await prisma.song.findMany({ 
      where: { isDeleted: false, status: 'approved' },
      select: { id: true, durationMs: true } 
    });

    if (users.length === 0 || songs.length === 0) {
      console.log('⚠️ Cần có ít nhất 1 User và 1 Song (đã duyệt) trong Database để tạo lượt nghe.');
      return;
    }

    console.log(`Đã tìm thấy ${users.length} Users và ${songs.length} Songs.`);

    const now = new Date();
    let totalInteractions = 0;

    // Xóa bớt data interaction cũ nếu muốn (tùy chọn)
    // await prisma.interaction.deleteMany();

    // 2. Tạo random từ 10 đến 100 lượt nghe cho mỗi bài hát
    for (const song of songs) {
      const numListens = Math.floor(Math.random() * 90) + 10; // 10 -> 100
      
      const interactionsToCreate = [];
      for (let i = 0; i < numListens; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Random ngày trong vòng 30 ngày qua
        const daysAgo = Math.floor(Math.random() * 30);
        const timeStamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Random durationPlayed (từ 30% đến 100% thời lượng bài hát)
        const completionRate = (Math.random() * 0.7) + 0.3; 
        const durationPlayed = Math.floor((song.durationMs || 200000) * completionRate);

        interactionsToCreate.push({
          userId: randomUser.id,
          songId: song.id,
          timeStamp: timeStamp,
          completionRate: completionRate,
          isSkipped: false,
          isLiked: Math.random() > 0.8, // 20% tỉ lệ like
          durationPlayed: durationPlayed
        });
      }

      await prisma.interaction.createMany({
        data: interactionsToCreate,
        skipDuplicates: true
      });

      totalInteractions += interactionsToCreate.length;
    }

    console.log(`\n✨ Hoàn tất! Đã tạo thành công ${totalInteractions} lượt nghe giả.`);
    console.log('👉 Bây giờ bạn có thể quay lại trang Admin và ấn "Cập nhật Bảng Xếp Hạng"!\n');

  } catch (error) {
    console.error('❌ Lỗi khi tạo lượt nghe giả:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedInteractions();
