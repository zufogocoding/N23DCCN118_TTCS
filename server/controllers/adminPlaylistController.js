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

const hidePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const playlistId = parseInt(id);

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      return res.status(404).json({ error: "Playlist không tồn tại" });
    }

    if (!playlist.isPublic) {
      return res.status(400).json({ error: "Playlist đã ở trạng thái riêng tư" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.playlist.update({
        where: { id: playlistId },
        data: { isPublic: false }
      });

      if (playlist.userId) {
        await tx.notification.create({
          data: {
            userId: playlist.userId,
            type: 'playlist_hidden',
            targetType: 'PLAYLIST',
            targetId: playlist.id,
            actionUrl: `/playlist/${playlist.id}`,
            message: `CẢNH BÁO: Playlist "${playlist.title}" của bạn đã bị Admin ẩn (chuyển về trạng thái Riêng Tư) do vi phạm quy định. ${reason ? `Lý do: ${reason}` : ''}`
          }
        });
      }
    });

    res.json({ message: "Đã ẩn Playlist và gửi thông báo cho người tạo" });
  } catch (error) {
    console.error("Lỗi khi ẩn playlist:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getAllPlaylists,
  deletePlaylist,
  hidePlaylist,
};
