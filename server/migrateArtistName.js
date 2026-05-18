const prisma = require('./db/index');

async function main() {
  console.log('Bắt đầu copy dữ liệu từ Artist.artistName sang User.displayName...');
  
  // Lấy tất cả artist có artistName
  const artists = await prisma.artist.findMany({
    where: {
      artistName: { not: null }
    }
  });

  console.log(`Tìm thấy ${artists.length} nghệ sĩ cần migrate.`);

  for (const artist of artists) {
    if (artist.artistName && artist.artistName.trim() !== '') {
      await prisma.user.update({
        where: { id: artist.userId },
        data: { displayName: artist.artistName }
      });
      console.log(`Đã cập nhật User ${artist.userId} displayName thành: ${artist.artistName}`);
    }
  }

  console.log('Hoàn tất migration dữ liệu!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
