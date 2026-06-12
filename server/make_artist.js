const prisma = require('./db/index');

async function main() {
  const username = process.argv[2] || 'sixteentyph';
  
  const user = await prisma.user.findFirst({
    where: { username }
  });

  if (!user) {
    console.error(`❌ Không tìm thấy user với username: "${username}"`);
    process.exit(1);
  }

  // Cập nhật role của User
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'artist' }
  });

  // Tạo hoặc cập nhật bản ghi Artist
  const artist = await prisma.artist.upsert({
    where: { userId: user.id },
    update: { status: 'active' },
    create: {
      userId: user.id,
      status: 'active',
      verifiedTick: true
    }
  });

  console.log(`✅ Đã chuyển thành công user "${username}" (ID: ${user.id}) thành Nghệ sĩ hoạt động (status: active)!`);
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    if (prisma.$pool) {
      prisma.$pool.end();
    }
  });
