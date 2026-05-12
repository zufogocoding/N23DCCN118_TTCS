const prisma = require('../db/index');

const songController = {
  // 1. Logic Upload
  uploadSong: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Chưa chọn file!' });

      const savedAudioUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      const { title, durationMs } = req.body;

      const newSong = await prisma.song.create({
        data: {
          title: title || 'Bài hát chưa đặt tên',
          durationMs: parseInt(durationMs) || 0,
          audioUrl: savedAudioUrl,
        }
      });
      res.status(201).json({ message: 'Upload thành công!', song: newSong });
    } catch (error) {
      console.error("Lỗi uploadSong:", error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  // 2. Logic Lấy tất cả bài hát (chỉ lấy bài chưa bị xóa mềm)
  getAllSongs: async (req, res) => {
    try {
      const allSongs = await prisma.song.findMany({
        where: { isDeleted: false },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true } } }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(allSongs);
    } catch (error) {
      console.error("Lỗi getAllSongs:", error);
      res.status(500).json({ error: 'Không lấy được danh sách bài hát' });
    }
  },

  // 3. Logic Lấy 1 bài hát theo ID (chỉ lấy bài chưa bị xóa mềm)
  getSongById: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const song = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true } } }
              }
            }
          },
          genres: {
            include: { genre: true }
          }
        }
      });
      if (!song) return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      res.status(200).json(song);
    } catch (error) {
      console.error("Lỗi getSongById:", error);
      res.status(500).json({ error: 'Lỗi khi tìm bài hát' });
    }
  },

  // 4. Logic Đổi tên
  updateSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const { newTitle } = req.body;

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const existing = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      }

      const updatedSong = await prisma.song.update({
        where: { id: songId },
        data: { title: newTitle }
      });
      res.status(200).json({ message: 'Đổi tên thành công!', song: updatedSong });
    } catch (error) {
      console.error("Lỗi updateSong:", error);
      res.status(500).json({ error: 'Không thể sửa bài hát' });
    }
  },

  // 5. Logic Xóa mềm (Soft Delete) - chỉ đánh dấu isDeleted = true thay vì xóa vĩnh viễn
  deleteSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const existing = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      }

      await prisma.song.update({
        where: { id: songId },
        data: { isDeleted: true }
      });
      res.status(200).json({ message: 'Đã xóa bài hát khỏi hệ thống!' });
    } catch (error) {
      console.error("Lỗi deleteSong:", error);
      res.status(500).json({ error: 'Không thể xóa' });
    }
  }
};

module.exports = songController;
