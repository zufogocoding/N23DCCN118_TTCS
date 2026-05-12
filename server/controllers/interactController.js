// server/controllers/interactController.js
const prisma = require('../db/index');

const interactController = {
  /**
   * Ghi nhận tương tác nghe nhạc (LISTEN / SKIP)
   * Mỗi lần nghe = 1 record mới trong bảng Interaction (composite key: userId + songId + timeStamp)
   */
  trackListening: async (req, res) => {
    try {
      const { userId, songId, durationPlayed, isSkipped } = req.body;

      if (!userId || !songId) {
        return res.status(400).json({ error: "Thiếu userId hoặc songId" });
      }

      // Kiểm tra bài hát có tồn tại và chưa bị xóa không
      const song = await prisma.song.findFirst({
        where: { id: parseInt(songId), isDeleted: false }
      });

      if (!song) {
        return res.status(404).json({ error: "Bài hát không tồn tại hoặc đã bị xóa" });
      }

      // Tính completionRate = durationPlayed / tổng thời lượng bài hát
      const parsedDuration = parseInt(durationPlayed) || 0;
      const completionRate = song.durationMs > 0
        ? Math.min(parsedDuration / song.durationMs, 1.0)
        : 0;

      const interaction = await prisma.interaction.create({
        data: {
          userId: parseInt(userId),
          songId: parseInt(songId),
          durationPlayed: parsedDuration,
          completionRate: completionRate,
          isSkipped: Boolean(isSkipped),
          isLiked: false
        }
      });

      res.status(200).json({ message: "Đã ghi nhận tương tác", data: interaction });
    } catch (error) {
      console.error("Lỗi trackListening:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  /**
   * Toggle Like / Unlike bài hát
   * Tìm record interaction gần nhất của user với bài hát đó và toggle isLiked
   * Nếu chưa có record nào → tạo record mới với isLiked = true
   */
  toggleLike: async (req, res) => {
    try {
      const { userId, songId } = req.body;

      if (!userId || !songId) {
        return res.status(400).json({ error: "Thiếu userId hoặc songId" });
      }

      const parsedUserId = parseInt(userId);
      const parsedSongId = parseInt(songId);

      // Kiểm tra bài hát có tồn tại không
      const song = await prisma.song.findFirst({
        where: { id: parsedSongId, isDeleted: false }
      });

      if (!song) {
        return res.status(404).json({ error: "Bài hát không tồn tại hoặc đã bị xóa" });
      }

      // Tìm record liked gần nhất (interaction mới nhất mà isLiked = true)
      const existingLike = await prisma.interaction.findFirst({
        where: {
          userId: parsedUserId,
          songId: parsedSongId,
          isLiked: true
        },
        orderBy: { timeStamp: 'desc' }
      });

      if (existingLike) {
        // Đã like rồi → unlike (cập nhật record đó thành isLiked = false)
        await prisma.interaction.update({
          where: {
            userId_songId_timeStamp: {
              userId: existingLike.userId,
              songId: existingLike.songId,
              timeStamp: existingLike.timeStamp
            }
          },
          data: { isLiked: false }
        });
        return res.status(200).json({ message: "Đã bỏ thích", isLiked: false });
      } else {
        // Chưa like → tạo record mới với isLiked = true
        await prisma.interaction.create({
          data: {
            userId: parsedUserId,
            songId: parsedSongId,
            isLiked: true,
            isSkipped: false,
            durationPlayed: 0,
            completionRate: 0
          }
        });
        return res.status(200).json({ message: "Đã thích", isLiked: true });
      }
    } catch (error) {
      console.error("Lỗi toggleLike:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  /**
   * Kiểm tra trạng thái like của user với 1 bài hát
   */
  checkLikeStatus: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const songId = parseInt(req.params.songId);

      const likedInteraction = await prisma.interaction.findFirst({
        where: {
          userId,
          songId,
          isLiked: true
        }
      });

      res.status(200).json({ isLiked: Boolean(likedInteraction) });
    } catch (error) {
      console.error("Lỗi checkLikeStatus:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
};

module.exports = interactController;
