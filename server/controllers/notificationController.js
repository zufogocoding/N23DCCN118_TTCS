const prisma = require('../db/index');

const notificationController = {
  // Lấy danh sách thông báo của user hiện tại
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.id;

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20 // Lấy tối đa 20 thông báo gần nhất
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false }
      });

      res.status(200).json({ notifications, unreadCount });
    } catch (error) {
      console.error("Lỗi getNotifications:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await prisma.notification.updateMany({
        where: { id: parseInt(id), userId },
        data: { isRead: true }
      });

      res.status(200).json({ message: "Đã đánh dấu đã đọc" });
    } catch (error) {
      console.error("Lỗi markAsRead:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;

      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });

      res.status(200).json({ message: "Đã đánh dấu tất cả đã đọc" });
    } catch (error) {
      console.error("Lỗi markAllAsRead:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
};

module.exports = notificationController;
