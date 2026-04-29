const prisma = require('../db/index');

const playlistController = {
  // 1. Tạo Playlist mới
  createPlaylist: async (req, res) => {
    try {
      const { title, userId } = req.body;
      
      // Tạo một URL ngẫu nhiên nhưng đảm bảo không bao giờ trùng (Dùng Date.now)
      const generatedUrl = `playlist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newPlaylist = await prisma.playlist.create({
        data: {
          title: title || 'Playlist Mới',
          playlistUrl: generatedUrl, // Bắt buộc phải có theo schema của bạn
          userId: parseInt(userId)
        }
      });
      res.status(201).json({ message: 'Tạo Playlist thành công!', playlist: newPlaylist });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Lỗi server khi tạo Playlist' });
    }
  },

  // 2. Thêm bài hát vào Playlist (Bắn qua bảng trung gian PlaylistSong)
  addSongToPlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const { songId } = req.body;

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
      console.log(error);
      // Lỗi thường gặp nhất ở đây là do playlistId hoặc songId không tồn tại, hoặc đã thêm rồi
      res.status(500).json({ error: 'Lỗi khi thêm bài hát (Có thể bài này đã có trong Playlist)' });
    }
  },

  // 3. Xem chi tiết Playlist (Phải chui qua bảng trung gian mới lấy được thông tin Song)
  getPlaylistById: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          songs: { // Gọi vào bảng trung gian PlaylistSong
            include: {
              song: true // Từ bảng trung gian mới móc nối sang lấy thông tin bảng Song
            }
          }
        }
      });

      if (!playlist) return res.status(404).json({ error: 'Không tìm thấy Playlist này!' });
      
      res.status(200).json(playlist);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  }
};

module.exports = playlistController;