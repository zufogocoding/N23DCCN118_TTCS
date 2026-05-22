// server/controllers/interactController.js
const prisma = require('../db/index');

const interactController = {
  /**
   * Ghi nhận tương tác nghe nhạc (LISTEN / SKIP)
   * Mỗi lần nghe = 1 record mới trong bảng Interaction (composite key: userId + songId + timeStamp)
   */
  trackListening: async (req, res) => {
    try {
      const userId = req.user.id;
      const { songId, durationPlayed, isSkipped } = req.body;

      if (!songId) {
        return res.status(400).json({ error: "Thiếu songId" });
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

      // Tăng playCount cho bài hát
      await prisma.song.update({
        where: { id: parseInt(songId) },
        data: {
          playCount: {
            increment: 1
          }
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
      const userId = req.user.id;
      const { songId } = req.body;

      if (!songId) {
        return res.status(400).json({ error: "Thiếu songId" });
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
      const userId = req.user.id;
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
  },

  /**
   * Lấy danh sách tất cả bài hát đã like của user
   */
  getLikedSongs: async (req, res) => {
    try {
      const userId = req.user.id;

      // Tìm tất cả songId mà user đã like (isLiked = true)
      const likedInteractions = await prisma.interaction.findMany({
        where: {
          userId,
          isLiked: true
        },
        select: { songId: true },
        distinct: ['songId']
      });

      const songIds = likedInteractions.map(i => i.songId);

      if (songIds.length === 0) {
        return res.status(200).json([]);
      }

      // Lấy thông tin đầy đủ của các bài hát
      const songs = await prisma.song.findMany({
        where: {
          id: { in: songIds },
          isDeleted: false
        },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          }
        }
      });

      res.status(200).json(songs);
    } catch (error) {
      console.error("Lỗi getLikedSongs:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  /**
   * Kiểm tra trạng thái thích của nhiều bài hát cùng lúc
   */
  batchCheckLikeStatus: async (req, res) => {
    try {
      const userId = req.user.id;
      const { songIds } = req.body;

      if (!songIds || !Array.isArray(songIds)) {
        return res.status(400).json({ error: "songIds phải là một danh sách" });
      }

      const parsedSongIds = songIds.map(id => parseInt(id)).filter(id => !isNaN(id));

      const likedInteractions = await prisma.interaction.findMany({
        where: {
          userId,
          songId: { in: parsedSongIds },
          isLiked: true
        },
        select: { songId: true }
      });

      const likedSet = new Set(likedInteractions.map(i => i.songId));
      const statusMap = {};
      parsedSongIds.forEach(id => {
        statusMap[id] = likedSet.has(id);
      });

      res.status(200).json(statusMap);
    } catch (error) {
      console.error("Lỗi batchCheckLikeStatus:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
};

module.exports = interactController;
