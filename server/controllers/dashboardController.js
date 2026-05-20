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
  },

  // Lấy số lượt nghe theo ngày trong 7 ngày gần nhất từ bảng Interaction
  getStreamingStats: async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      const result = [];

      for (let i = days - 1; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        const count = await prisma.interaction.count({
          where: {
            timeStamp: {
              gte: start,
              lte: end
            }
          }
        });

        const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        result.push({ date: label, streams: count });
      }

      res.status(200).json(result);
    } catch (error) {
      console.log("🚨 LỖI STREAMING STATS:", error);
      res.status(500).json({ error: "Lỗi server khi lấy thống kê streaming" });
    }
  },

  // Lấy các hoạt động gần đây cần xem xét (pending songs + artist requests)
  getRecentActivities: async (req, res) => {
    try {
      const [pendingSongs, artistRequests] = await Promise.all([
        prisma.song.findMany({
          where: { status: 'pending', isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            artists: {
              select: {
                artist: {
                  select: {
                    user: { select: { username: true } }
                  }
                }
              },
              take: 1
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.artistRequest.findMany({
          where: { status: 'PENDING' },
          select: {
            id: true,
            artistName: true,
            status: true,
            createdAt: true,
            user: { select: { username: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      // Gộp và chuẩn hóa dữ liệu
      const activities = [
        ...pendingSongs.map(s => ({
          id: `S-${s.id}`,
          type: 'Pending Song',
          item: `Song: "${s.title}"`,
          status: 'Under Review',
          date: s.createdAt.toISOString().split('T')[0]
        })),
        ...artistRequests.map(r => ({
          id: `AR-${r.id}`,
          type: 'Artist Request',
          item: `Artist: "${r.artistName}" (@${r.user?.username || 'unknown'})`,
          status: 'Under Review',
          date: r.createdAt.toISOString().split('T')[0]
        }))
      ];

      // Sắp xếp theo ngày mới nhất
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.status(200).json(activities.slice(0, 10));
    } catch (error) {
      console.log("🚨 LỖI RECENT ACTIVITIES:", error);
      res.status(500).json({ error: "Lỗi server khi lấy hoạt động gần đây" });
    }
  }

};

module.exports = dashboardController;