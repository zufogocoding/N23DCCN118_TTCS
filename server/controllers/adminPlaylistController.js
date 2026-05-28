const prisma = require('../db/index');

const getAllPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { isSystem: true },
      include: {
        _count: {
          select: { songs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(playlists);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách playlist:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

const createSystemPlaylist = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    let coverArtUrl = null;
    if (req.file) {
      coverArtUrl = `/uploads/covers/${req.file.filename}`;
    }

    const generatedUrl = `system-playlist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newPlaylist = await prisma.playlist.create({
      data: {
        title: title || 'Playlist Mới',
        description: description || null,
        playlistUrl: generatedUrl,
        userId: req.user.id,
        coverArtUrl: coverArtUrl,
        isSystem: true,
        isPublic: isPublic === 'true' || isPublic === true
      }
    });

    if (req.body.songIds) {
      try {
        const parsedSongIds = JSON.parse(req.body.songIds);
        if (Array.isArray(parsedSongIds) && parsedSongIds.length > 0) {
          const playlistSongsData = parsedSongIds.map(songId => ({
            playlistId: newPlaylist.id,
            songId: parseInt(songId)
          }));
          await prisma.playlistSong.createMany({
            data: playlistSongsData,
            skipDuplicates: true
          });
        }
      } catch (e) {
        console.error("Lỗi parse songIds", e);
      }
    }

    res.status(201).json({ message: 'Tạo System Playlist thành công!', playlist: newPlaylist });
  } catch (error) {
    console.error("Lỗi createSystemPlaylist:", error);
    res.status(500).json({ error: 'Lỗi server khi tạo Playlist' });
  }
};

const toggleSystemPlaylistVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    const playlist = await prisma.playlist.update({
      where: { id: parseInt(id) },
      data: { isPublic: isPublic === true || isPublic === 'true' }
    });

    res.json({ message: 'Cập nhật trạng thái thành công', playlist });
  } catch (error) {
    console.error("Lỗi toggleSystemPlaylistVisibility:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.playlist.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Đã xóa danh sách phát thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa playlist:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Playlist không tồn tại" });
    }
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getAllPlaylists,
  createSystemPlaylist,
  toggleSystemPlaylistVisibility,
  deletePlaylist,
};
