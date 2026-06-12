/**
 * Script tạo 20 user ảo cho hệ thống
 * Chạy: node scripts/seedUsers.js
 * 
 * Mật khẩu chung: 123456
 */

const bcrypt = require('bcrypt');
const prisma = require('../db/index');

const FAKE_USERS = [
  { username: 'nguyenvana',    displayName: 'Nguyễn Văn An',       email: 'nguyenvana@demo.com',    country: 'Việt Nam',    dob: '2000-03-15' },
  { username: 'tranthib',      displayName: 'Trần Thị Bích',       email: 'tranthib@demo.com',      country: 'Việt Nam',    dob: '1999-07-22' },
  { username: 'lehoancc',      displayName: 'Lê Hoàng Cường',      email: 'lehoancc@demo.com',      country: 'Việt Nam',    dob: '2001-01-10' },
  { username: 'phamduyd',      displayName: 'Phạm Duy Đạt',        email: 'phamduyd@demo.com',      country: 'Việt Nam',    dob: '1998-11-05' },
  { username: 'hoangmye',      displayName: 'Hoàng Mỹ Elysia',     email: 'hoangmye@demo.com',      country: 'Việt Nam',    dob: '2002-06-18' },
  { username: 'vothif',        displayName: 'Võ Thị Phương',        email: 'vothif@demo.com',        country: 'Việt Nam',    dob: '2000-09-30' },
  { username: 'dangquangg',    displayName: 'Đặng Quang Giàu',     email: 'dangquangg@demo.com',    country: 'Việt Nam',    dob: '1997-04-12' },
  { username: 'buithih',       displayName: 'Bùi Thị Hạnh',        email: 'buithih@demo.com',       country: 'Việt Nam',    dob: '2001-12-25' },
  { username: 'ngominhi',      displayName: 'Ngô Minh Khôi',       email: 'ngominhi@demo.com',      country: 'Việt Nam',    dob: '1999-02-14' },
  { username: 'dothik',        displayName: 'Đỗ Thị Kim',          email: 'dothik@demo.com',        country: 'Việt Nam',    dob: '2003-08-07' },
  { username: 'lythanhh',      displayName: 'Lý Thanh Hùng',       email: 'lythanhh@demo.com',      country: 'Việt Nam',    dob: '1996-05-20' },
  { username: 'musiclover99',  displayName: 'Music Lover',          email: 'musiclover99@demo.com',  country: 'Hàn Quốc',   dob: '1999-10-11' },
  { username: 'sakurafan',     displayName: 'Sakura Fan',           email: 'sakurafan@demo.com',     country: 'Nhật Bản',   dob: '2000-04-01' },
  { username: 'chillvibes',    displayName: 'Chill Vibes',          email: 'chillvibes@demo.com',    country: 'Thái Lan',   dob: '2001-07-07' },
  { username: 'beatmaker_vn',  displayName: 'Beat Maker VN',        email: 'beatmaker@demo.com',     country: 'Việt Nam',    dob: '1998-03-28' },
  { username: 'indie_soul',    displayName: 'Indie Soul',           email: 'indiesoul@demo.com',     country: 'Việt Nam',    dob: '2002-11-15' },
  { username: 'rapfanboy',     displayName: 'Rap Fan Boy',          email: 'rapfanboy@demo.com',     country: 'Mỹ',         dob: '1997-09-03' },
  { username: 'lofi_girl_vn',  displayName: 'Lofi Girl VN',         email: 'lofigirl@demo.com',      country: 'Việt Nam',    dob: '2003-01-20' },
  { username: 'kpopstan',      displayName: 'K-Pop Stan',           email: 'kpopstan@demo.com',      country: 'Hàn Quốc',   dob: '2000-06-25' },
  { username: 'acoustic_vibe', displayName: 'Acoustic Vibe',        email: 'acousticvibe@demo.com',  country: 'Việt Nam',    dob: '1999-08-19' },
];

async function seedUsers() {
  const COMMON_PASSWORD = '123456';
  const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 10);

  console.log('🌱 Bắt đầu tạo 20 user ảo...\n');

  let created = 0;
  let skipped = 0;

  for (const u of FAKE_USERS) {
    // Kiểm tra trùng email hoặc username
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: u.email },
          { username: u.username }
        ]
      }
    });

    if (existing) {
      console.log(`⏭️  Bỏ qua: ${u.username} (${u.email}) — đã tồn tại`);
      skipped++;
      continue;
    }

    await prisma.user.create({
      data: {
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        password: hashedPassword,
        country: u.country,
        dob: new Date(u.dob),
        isVerified: true,
        isActive: true,
        role: 'user',
      }
    });

    console.log(`✅ Đã tạo: ${u.displayName} (@${u.username})`);
    created++;
  }

  console.log(`\n🎉 Hoàn tất! Đã tạo ${created} user mới, bỏ qua ${skipped} user trùng.`);
  console.log(`🔑 Mật khẩu chung: ${COMMON_PASSWORD}`);
}

seedUsers()
  .catch((err) => {
    console.error('❌ Lỗi:', err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
