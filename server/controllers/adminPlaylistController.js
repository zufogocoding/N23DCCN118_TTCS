const prisma = require('../db/index');
const fs = require('fs');
const path = require('path');

// Helper to delete physical files safely
const deleteFile = (relativePath) => {
  if (!relativePath) return;
  const absolutePath = path.resolve(process.cwd(), relativePath.startsWith('/') ? relativePath.substring(1) : relativePath);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.error(`[deleteFile] Không thể xóa file ${absolutePath}:`, err.message);
    }
  }
};

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
    res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ", details: error });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const playlistId = parseInt(id);

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      return res.status(404).json({ error: "Playlist không tồn tại" });
    }

    // Prisma Cascade delete đã được thiết lập ở database (PlaylistSong)
    await prisma.playlist.delete({
      where: {
        id: playlistId,
      }
    });

    // Clean up coverArt from storage
    if (playlist.coverArtUrl) {
      deleteFile(playlist.coverArtUrl);
    }

    res.json({ message: "Đã xóa danh sách phát thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa playlist:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getAllPlaylists,
  deletePlaylist,
};
