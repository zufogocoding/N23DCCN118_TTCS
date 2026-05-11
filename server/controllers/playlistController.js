const prisma = require('../db/index');

const playlistController = {
  // 1. Tạo Playlist mới
  createPlaylist: async (req, res) => {
    try {
      const { title, userId, description } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'Thiếu userId' });
      }

      // Kiểm tra user tồn tại
      const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      if (!user) {
        return res.status(404).json({ error: 'User không tồn tại' });
      }

      // Tạo một URL ngẫu nhiên nhưng đảm bảo không bao giờ trùng (Dùng Date.now)
      const generatedUrl = `playlist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newPlaylist = await prisma.playlist.create({
        data: {
          title: title || 'Playlist Mới',
          description: description || null,
          playlistUrl: generatedUrl, // Bắt buộc phải có theo schema
          userId: parseInt(userId)
        }
      });
      res.status(201).json({ message: 'Tạo Playlist thành công!', playlist: newPlaylist });
    } catch (error) {
      console.error("Lỗi createPlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi tạo Playlist' });
    }
  },

  // 2. Thêm bài hát vào Playlist (Bắn qua bảng trung gian PlaylistSong)
  addSongToPlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const { songId, userId } = req.body;

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Kiểm tra quyền sở hữu: chỉ chủ playlist mới được thêm bài
      if (userId && playlist.userId !== parseInt(userId)) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa Playlist này' });
      }

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const song = await prisma.song.findFirst({
        where: { id: parseInt(songId), isDeleted: false }
      });
      if (!song) {
        return res.status(404).json({ error: 'Bài hát không tồn tại hoặc đã bị xóa' });
      }

      // Vì dùng bảng trung gian Explicit, ta phải tạo record ở bảng PlaylistSong
      const newPlaylistSong = await prisma.playlistSong.create({
        data: {
          playlistId: playlistId,
          songId: parseInt(songId)
          // addAt sẽ tự động lấy now() theo schema
        }
      });

      res.status(200).json({ message: 'Đã thêm bài hát vào Playlist!', data: newPlaylistSong });
    } catch (error) {
      console.error("Lỗi addSongToPlaylist:", error);
      // Lỗi thường gặp nhất ở đây là do bài này đã có trong Playlist (trùng composite key)
      res.status(500).json({ error: 'Lỗi khi thêm bài hát (Có thể bài này đã có trong Playlist)' });
    }
  },

  // 3. Xóa bài hát khỏi Playlist
  removeSongFromPlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const songId = parseInt(req.params.songId);
      const { userId } = req.body;

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Kiểm tra quyền sở hữu
      if (userId && playlist.userId !== parseInt(userId)) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa Playlist này' });
      }

      await prisma.playlistSong.delete({
        where: {
          playlistId_songId: {
            playlistId: playlistId,
            songId: songId
          }
        }
      });

      res.status(200).json({ message: 'Đã xóa bài hát khỏi Playlist!' });
    } catch (error) {
      console.error("Lỗi removeSongFromPlaylist:", error);
      res.status(500).json({ error: 'Lỗi khi xóa bài hát khỏi Playlist' });
    }
  },

  // 4. Xem chi tiết Playlist (Phải chui qua bảng trung gian mới lấy được thông tin Song)
  getPlaylistById: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);

      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          songs: { // Gọi vào bảng trung gian PlaylistSong
            include: {
              song: {
                include: {
                  artists: {
                    include: {
                      artist: {
                        include: { user: { select: { username: true } } }
                      }
                    }
                  }
                }
              }
            },
            orderBy: { addAt: 'asc' }
          }
        }
      });

      if (!playlist) return res.status(404).json({ error: 'Không tìm thấy Playlist này!' });

      // Lọc bỏ bài hát đã bị soft delete
      playlist.songs = playlist.songs.filter(ps => !ps.song.isDeleted);

      res.status(200).json(playlist);
    } catch (error) {
      console.error("Lỗi getPlaylistById:", error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  // 5. Lấy danh sách playlist của 1 user
  getUserPlaylists: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const playlists = await prisma.playlist.findMany({
        where: { userId },
        include: {
          _count: { select: { songs: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.status(200).json(playlists);
    } catch (error) {
      console.error("Lỗi getUserPlaylists:", error);
      res.status(500).json({ error: 'Lỗi server khi lấy danh sách Playlist' });
    }
  },

  // 6. Xóa Playlist
  deletePlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const { userId } = req.body;

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Kiểm tra quyền sở hữu
      if (userId && playlist.userId !== parseInt(userId)) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa Playlist này' });
      }

      // Xóa playlist (cascade sẽ tự xóa các PlaylistSong liên quan)
      await prisma.playlist.delete({ where: { id: playlistId } });

      res.status(200).json({ message: 'Đã xóa Playlist!' });
    } catch (error) {
      console.error("Lỗi deletePlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi xóa Playlist' });
    }
  },

  // 7. Cập nhật thông tin Playlist (title, description, isPublic)
  updatePlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const { userId, title, description, isPublic } = req.body;

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Kiểm tra quyền sở hữu
      if (userId && playlist.userId !== parseInt(userId)) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa Playlist này' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);

      const updatedPlaylist = await prisma.playlist.update({
        where: { id: playlistId },
        data: updateData
      });

      res.status(200).json({ message: 'Cập nhật Playlist thành công!', playlist: updatedPlaylist });
    } catch (error) {
      console.error("Lỗi updatePlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi cập nhật Playlist' });
    }
  }
};

module.exports = playlistController;