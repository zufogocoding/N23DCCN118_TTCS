/**
 * Seed Genres: Thêm các thể loại nhạc phổ biến Việt Nam & Quốc tế
 * Chạy: node seedGenres.cjs
 * 
 * Script sử dụng upsert nên chạy nhiều lần cũng không tạo trùng.
 */
require('dotenv').config();
const prisma = require('./db/index.js');

const GENRES = [
  // ── Quốc tế ──
  'Pop',
  'Rock',
  'R&B',
  'Hip-Hop',
  'Rap',
  'Jazz',
  'Blues',
  'Country',
  'EDM',
  'House',
  'Techno',
  'Trance',
  'Dubstep',
  'Drum & Bass',
  'Indie',
  'Alternative',
  'Metal',
  'Punk',
  'Reggae',
  'Soul',
  'Funk',
  'Classical',
  'Lo-fi',
  'Acoustic',
  'Latin',
  'K-Pop',
  'J-Pop',
  'Gospel',
  'Disco',
  'Synthwave',

  // ── Việt Nam ──
  'Bolero',
  'Nhạc Trữ Tình',
  'Nhạc Trẻ',
  'V-Pop',
  'Nhạc Vàng',
  'Cải Lương',
  'Dân Ca',
  'Nhạc Cách Mạng',
  'Nhạc Phim Việt',
  'Rap Việt',
];

async function seedGenres() {
  console.log('\n🏷️  Bắt đầu seed thể loại nhạc...\n');

  let created = 0;
  let skipped = 0;

  for (const tag of GENRES) {
    const genre = await prisma.genre.upsert({
      where: { genreTag: tag },
      update: {},           // Đã tồn tại → không làm gì
      create: { genreTag: tag },
    });

    // Kiểm tra xem vừa tạo mới hay đã có sẵn
    // upsert luôn trả về record, ta dựa vào việc so sánh để log
    const existed = genre.genreTag === tag; // luôn true, nên dùng cách khác
    // Đơn giản: thử findFirst trước để biết chính xác
    // Nhưng upsert đã xử lý an toàn rồi, ta chỉ cần log
    console.log(`  ✅ ${tag} (id: ${genre.id})`);
    created++;
  }

  console.log(`\n✨ Hoàn tất! Đã xử lý ${created} thể loại.`);
  console.log('   (Các genre đã tồn tại sẽ được bỏ qua, không tạo trùng)\n');
}

async function seedCharts() {
  console.log('\n🏷️  Bắt đầu seed bảng xếp hạng...\n');

  const CHARTS = [
    { title: 'Top 50 Ngày', chartType: 'DAILY' },
    { title: 'Top 50 Tuần', chartType: 'WEEKLY' },
    { title: 'Top 50 Tháng', chartType: 'MONTHLY' },
  ];

  let created = 0;

  for (const chartData of CHARTS) {
    // Vì schema prisma.chart chưa có trường @unique (ngoài id), ta không thể dùng trực tiếp prisma.chart.upsert() theo chartType.
    // Thay vào đó, ta sẽ dùng findFirst và create để đảm bảo logic chạy an toàn.
    const existingChart = await prisma.chart.findFirst({
      where: { chartType: chartData.chartType },
    });

    if (!existingChart) {
      const newChart = await prisma.chart.create({
        data: chartData,
      });
      console.log(`  ✅ ${newChart.title} (id: ${newChart.id})`);
      created++;
    } else {
      console.log(`  ⏩ Đã tồn tại ${existingChart.title} (id: ${existingChart.id})`);
    }
  }

  console.log(`\n✨ Hoàn tất! Đã tạo mới ${created} bảng xếp hạng.\n`);
}

async function main() {
  await seedGenres();
  await seedCharts();
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
