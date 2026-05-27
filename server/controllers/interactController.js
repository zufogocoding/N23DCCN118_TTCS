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
   * Toggle Like / Unlike bài hát sử dụng bảng SongLike
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

      // Kiểm tra xem đã thích chưa
      const existingLike = await prisma.songLike.findUnique({
        where: {
          userId_songId: {
            userId: parsedUserId,
            songId: parsedSongId
          }
        }
      });

      if (existingLike) {
        // Đã thích -> Bỏ thích
        await prisma.songLike.delete({
          where: {
            userId_songId: {
              userId: parsedUserId,
              songId: parsedSongId
            }
          }
        });
        return res.status(200).json({ message: "Đã bỏ thích", isLiked: false });
      } else {
        // Chưa thích -> Thích
        await prisma.songLike.create({
          data: {
            userId: parsedUserId,
            songId: parsedSongId
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
   * Kiểm tra trạng thái thích của user với 1 bài hát
   */
  checkLikeStatus: async (req, res) => {
    try {
      const userId = req.user.id;
      const songId = parseInt(req.params.songId);

      const liked = await prisma.songLike.findUnique({
        where: {
          userId_songId: {
            userId,
            songId
          }
        }
      });

      res.status(200).json({ isLiked: Boolean(liked) });
    } catch (error) {
      console.error("Lỗi checkLikeStatus:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  /**
   * Lấy danh sách tất cả bài hát đã thích của user
   */
  getLikedSongs: async (req, res) => {
    try {
      const userId = req.user.id;

      // Tìm tất cả songId mà user đã thích
      const likedSongsRelation = await prisma.songLike.findMany({
        where: { userId },
        select: { songId: true }
      });

      const songIds = likedSongsRelation.map(i => i.songId);

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
   * Lấy danh sách bài hát nghe gần đây của user
   */
  getRecentSongs: async (req, res) => {
    try {
      const userId = req.user.id;

      const recentInteractions = await prisma.interaction.findMany({
        where: { userId },
        orderBy: { timeStamp: 'desc' },
        select: { songId: true },
        distinct: ['songId'],
        take: 30
      });

      const songIds = recentInteractions.map(i => i.songId);

      if (songIds.length === 0) {
        return res.status(200).json([]);
      }

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

      // Maintain order of recent history
      const orderedSongs = songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);

      res.status(200).json(orderedSongs);
    } catch (error) {
      console.error("Lỗi getRecentSongs:", error);
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

      const likedList = await prisma.songLike.findMany({
        where: {
          userId,
          songId: { in: parsedSongIds }
        },
        select: { songId: true }
      });

      const likedSet = new Set(likedList.map(i => i.songId));
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
