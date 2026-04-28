const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  // 2. Logic Lấy tất cả bài hát
  getAllSongs: async (req, res) => {
    try {
      const allSongs = await prisma.song.findMany();
      res.status(200).json(allSongs);
    } catch (error) {
      res.status(500).json({ error: 'Không lấy được danh sách bài hát' });
    }
  },

  // 3. Logic Lấy 1 bài hát theo ID
  getSongById: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const song = await prisma.song.findUnique({ where: { id: songId } });
      if (!song) return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      res.status(200).json(song);
    } catch (error) {
      res.status(500).json({ error: 'Lỗi khi tìm bài hát' });
    }
  },

  // 4. Logic Đổi tên
  updateSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const { newTitle } = req.body;
      const updatedSong = await prisma.song.update({
        where: { id: songId },
        data: { title: newTitle }
      });
      res.status(200).json({ message: 'Đổi tên thành công!', song: updatedSong });
    } catch (error) {
      res.status(500).json({ error: 'Không thể sửa bài hát' });
    }
  },

  // 5. Logic Xóa
  deleteSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      await prisma.song.delete({ where: { id: songId } });
      res.status(200).json({ message: 'Đã xóa bài hát khỏi hệ thống!' });
    } catch (error) {
      res.status(500).json({ error: 'Không thể xóa' });
    }
  }
};

module.exports = songController;
