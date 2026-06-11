const prisma = require('../db/index');

const genreController = {
  // 1. GET /api/genres - Lấy tất cả thể loại
  getAllGenres: async (req, res) => {
    try {
      const genres = await prisma.genre.findMany({
        orderBy: { genreTag: 'asc' },
      });
      res.status(200).json(genres);
    } catch (error) {
      console.error('Lỗi getAllGenres:', error);
      res.status(500).json({ error: 'Không lấy được danh sách thể loại' });
    }
  },

  // 2. POST /api/genres - Tạo mới thể loại
  createGenre: async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tên thể loại không được để trống' });
      }

      // Kiểm tra trùng
      const existing = await prisma.genre.findUnique({
        where: { genreTag: name.trim() },
      });
      if (existing) {
        return res.status(409).json({ error: `Thể loại "${name.trim()}" đã tồn tại` });
      }

      const genre = await prisma.genre.create({
        data: { genreTag: name.trim() },
      });

      res.status(201).json({ message: 'Tạo thể loại thành công', genre });
    } catch (error) {
      console.error('Lỗi createGenre:', error);
      res.status(500).json({ error: 'Không thể tạo thể loại' });
    }
  },

  // 3. PUT /api/genres/:id - Cập nhật tên thể loại
  updateGenre: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tên thể loại không được để trống' });
      }

      // Kiểm tra genre tồn tại
      const existing = await prisma.genre.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy thể loại' });
      }

      // Kiểm tra trùng tên với genre khác
      const duplicate = await prisma.genre.findUnique({
        where: { genreTag: name.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        return res.status(409).json({ error: `Thể loại "${name.trim()}" đã tồn tại` });
      }

      const updated = await prisma.genre.update({
        where: { id },
        data: { genreTag: name.trim() },
      });

      res.status(200).json({ message: 'Cập nhật thành công', genre: updated });
    } catch (error) {
      console.error('Lỗi updateGenre:', error);
      res.status(500).json({ error: 'Không thể cập nhật thể loại' });
    }
  },

  // 4. DELETE /api/genres/:id - Xóa thể loại
  deleteGenre: async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Kiểm tra genre tồn tại
      const existing = await prisma.genre.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy thể loại' });
      }

      // Xóa tất cả SongGenre liên quan trước, rồi xóa genre trong một transaction
      await prisma.$transaction(async (tx) => {
        await tx.songGenre.deleteMany({ where: { genreId: id } });
        await tx.genre.delete({ where: { id } });
      });

      res.status(200).json({ message: `Đã xóa thể loại "${existing.genreTag}"` });
    } catch (error) {
      console.error('Lỗi deleteGenre:', error);
      res.status(500).json({ error: 'Không thể xóa thể loại' });
    }
  },
};

module.exports = genreController;
