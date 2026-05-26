const prisma = require('../db/index.js');

const syncChart = async (chartType) => {
  // Xác định khoảng thời gian
  const now = new Date();
  let startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  if (chartType === 'DAILY') {
    // Từ 00:00 ngày hôm nay (đã set ở trên)
  } else if (chartType === 'WEEKLY') {
    // Từ 00:00 thứ Hai tuần này
    const dayOfWeek = startTime.getDay(); // 0 là Chủ Nhật
    const distanceToMonday = (dayOfWeek + 6) % 7;
    startTime.setDate(startTime.getDate() - distanceToMonday);
  } else if (chartType === 'MONTHLY') {
    // Từ 00:00 ngày mùng 1 tháng này
    startTime.setDate(1);
  } else {
    throw new Error('Invalid chartType. Must be DAILY, WEEKLY, or MONTHLY');
  }

  // Lấy ID của Chart
  const chart = await prisma.chart.findFirst({
    where: { chartType: chartType }
  });

  if (!chart) {
    throw new Error(`Chart with type ${chartType} not found. Please seed the database first.`);
  }

  // Query bảng Interaction: đếm lượt nghe hợp lệ, gom nhóm theo songId
  const interactions = await prisma.interaction.groupBy({
    by: ['songId'],
    where: {
      timeStamp: {
        gte: startTime,
        lte: now,
      },
      isSkipped: false,
      completionRate: {
        gte: 0.3,
      }
    },
    _count: {
      songId: true,
    },
    orderBy: {
      _count: {
        songId: 'desc',
      }
    },
    take: 50,
  });

  // Chuẩn bị dữ liệu insert vào ChartSong
  const chartSongsData = interactions.map((interaction, index) => ({
    chartId: chart.id,
    songId: interaction.songId,
    totalScore: interaction._count.songId,
    rank: index + 1,
  }));

  // Dùng transaction để xóa cũ và thêm mới
  await prisma.$transaction([
    prisma.chartSong.deleteMany({
      where: { chartId: chart.id }
    }),
    prisma.chartSong.createMany({
      data: chartSongsData
    }),
    // Cập nhật lại thời gian updateAt của bảng Chart
    prisma.chart.update({
      where: { id: chart.id },
      data: { updateAt: new Date() }
    })
  ]);

  return chartSongsData;
};

module.exports = { syncChart };
