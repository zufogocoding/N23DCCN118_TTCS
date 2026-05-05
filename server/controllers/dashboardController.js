const prisma = require('../db/index'); // Link tới file khởi tạo prisma

const dashboardController = {
  getStats: async (req, res) => {
    try {
      // Chạy 4 truy vấn song song cùng lúc bằng Promise.all để tăng tốc độ API
      const [totalUsers, totalSongs, totalPlaylists, pendingArtists] = await Promise.all([
        prisma.user.count(),
        prisma.song.count({ where: { isDeleted: false } }),
        prisma.playlist.count(),
        prisma.artist.count({ where: { verifiedTick: false } }) // Đếm các ca sĩ chưa được duyệt
      ]);

      // Trả dữ liệu về cho Front-end
      res.status(200).json({
        totalUsers,
        totalSongs,
        totalPlaylists,
        pendingArtists
      });
    } catch (error) {
      console.log("🚨 LỖI DASHBOARD STATS:", error);
      res.status(500).json({ error: "Lỗi server khi lấy dữ liệu thống kê" });
    }
  }
};

module.exports = dashboardController;