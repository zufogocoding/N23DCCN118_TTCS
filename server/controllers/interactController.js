// server/controllers/interactController.js
const prisma = require('../db/index');

const trackInteraction = async (req, res) => {
  try {
    const { userId, songId, action, duration } = req.body;

    if (!userId || !songId || !action) {
      return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc" });
    }

    // 1. Nếu hành động là LIKE / UNLIKE
    if (action === 'LIKE') {
      // Tìm xem đã like chưa
      const existingLike = await prisma.interaction.findFirst({
        where: { userId, songId, type: 'LIKE' }
      });

      if (existingLike) {
        // Nếu đã like rồi thì xóa (Toggle Unlike)
        await prisma.interaction.delete({ where: { id: existingLike.id } });
        return res.status(200).json({ message: "Đã bỏ thích", isLiked: false });
      } else {
        // Chưa like thì tạo mới
        await prisma.interaction.create({
          data: { userId, songId, type: 'LIKE' }
        });
        return res.status(200).json({ message: "Đã thích", isLiked: true });
      }
    }

    // 2. Nếu hành động là LISTEN hoặc SKIP (Ghi nhận lịch sử nghe)
    if (action === 'LISTEN' || action === 'SKIP') {
      await prisma.interaction.create({
        data: {
          userId,
          songId,
          type: action,
          duration: duration || 0 // Số giây user đã nghe
        }
      });

      // Nếu là LISTEN hợp lệ (nghe > 30s), có thể cộng 1 view vào bảng Song
      if (action === 'LISTEN') {
        await prisma.song.update({
          where: { id: songId },
          data: { playCount: { increment: 1 } }
        });
      }

      return res.status(200).json({ message: "Đã ghi nhận tương tác" });
    }

    return res.status(400).json({ error: "Hành động không hợp lệ" });

  } catch (error) {
    console.error("Lỗi trackInteraction:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

module.exports = {
  trackInteraction
};
