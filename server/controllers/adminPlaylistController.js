const prisma = require('../db/index');

const getAllPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true,
          }
        },
        _count: {
          select: {
            songs: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    res.json(playlists);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách playlist:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    // Prisma Cascade delete đã được thiết lập ở database (PlaylistSong)
    await prisma.playlist.delete({
      where: {
        id: parseInt(id),
      }
    });

    res.json({ message: "Đã xóa danh sách phát thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa playlist:", error);
    // Xử lý lỗi nếu playlist không tồn tại
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Playlist không tồn tại" });
    }
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getAllPlaylists,
  deletePlaylist,
};
