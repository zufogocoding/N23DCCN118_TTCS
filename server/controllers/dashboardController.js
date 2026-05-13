const prisma = require('../db/index'); // Link tới file khởi tạo prisma

const dashboardController = {
  getStats: async (req, res) => {
    try {
      // Chạy 4 truy vấn song song cùng lúc bằng Promise.all để tăng tốc độ API
      const [totalUsers, totalSongs, totalPlaylists, pendingArtists] = await Promise.all([
        prisma.user.count(),
        prisma.song.count({ where: { isDeleted: false } }),
        prisma.playlist.count(),
        prisma.artistRequest.count({ where: { status: 'PENDING' } }) // Đếm yêu cầu đăng ký chưa được duyệt
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
  },
  getUsers: async (req, res) => {
    try {

      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          isActive: true,
          createdAt: true
        }
      });

      res.status(200).json(users);

    } catch (error) {

      console.log("🚨 LỖI USERS:", error);

      res.status(500).json({
        error: "Lỗi server khi lấy users"
      });
    }
    },
  getSongs: async (req, res) => {
    try {

      const songs = await prisma.song.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true,
          title: true,
          status: true,
          durationMs: true,
          createdAt: true
        }
      });

      res.status(200).json(songs);

    } catch (error) {

      console.log("🚨 LỖI SONGS:", error);

      res.status(500).json({
        error: "Lỗi server khi lấy songs"
      });
    }
  }

};

module.exports = dashboardController;