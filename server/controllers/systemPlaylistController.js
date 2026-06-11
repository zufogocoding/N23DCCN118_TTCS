const prisma = require('../db/index');
const fs = require('fs');
const path = require('path');

const deleteFile = (relativePath) => {
  if (!relativePath || relativePath.startsWith('http')) return;
  const absolutePath = path.resolve(process.cwd(), relativePath.startsWith('/') ? relativePath.substring(1) : relativePath);
  if (fs.existsSync(absolutePath)) {
    try { fs.unlinkSync(absolutePath); } catch (err) { /* ignore */ }
  }
};

// [USER] GET /api/system-playlists/home
const getHomeSystemPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { isSystem: true, isOnHomepage: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        songs: {
          orderBy: { sortOrder: 'asc' },
          take: 10,
          include: { song: true }
        }
      }
    });
    res.json({ success: true, data: playlists });
  } catch (error) {
    console.error('Lỗi getHomeSystemPlaylists:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// [ADMIN] GET /api/admin/system-playlists
const getAllSystemPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { isSystem: true },
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { songs: true } } }
    });
    res.json({ success: true, data: playlists });
  } catch (error) {
    console.error('Lỗi getAllSystemPlaylists:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// [ADMIN] POST /api/admin/system-playlists
const createSystemPlaylist = async (req, res) => {
  try {
    const { title, description, category, displayOrder } = req.body;
    let coverArtUrl = req.body.coverArtUrl || '';

    if (req.file) {
      coverArtUrl = `/uploads/covers/${req.file.filename}`;
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Tên playlist không được để trống' });
    }

    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '') + '-' + Date.now();

    const newPlaylist = await prisma.playlist.create({
      data: {
        title: title.trim(),
        description: description || '',
        coverArtUrl: coverArtUrl,
        category: category || 'Nổi bật',
        displayOrder: parseInt(displayOrder) || 0,
        isSystem: true,
        isOnHomepage: true,
        playlistUrl: slug,
        userId: req.user.id
      }
    });

    res.json({ success: true, data: newPlaylist });
  } catch (error) {
    console.error('Lỗi createSystemPlaylist:', error);
    res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
};

// [ADMIN] GET /api/admin/system-playlists/:id
const getSystemPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(id) },
      include: {
        songs: {
          include: {
            song: {
              include: {
                artists: {
                  include: {
                    artist: { include: { user: true } }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!playlist) return res.status(404).json({ error: 'Không tìm thấy playlist' });
    res.json({ success: true, data: playlist });
  } catch (error) {
    console.error('Lỗi getSystemPlaylistById:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// [ADMIN] PUT /api/admin/system-playlists/:id
const updateSystemPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isOnHomepage, displayOrder, category } = req.body;

    const playlist = await prisma.playlist.findUnique({ where: { id: parseInt(id) } });
    if (!playlist) return res.status(404).json({ error: 'Không tìm thấy playlist' });

    let coverArtUrl = req.body.coverArtUrl || playlist.coverArtUrl || '';
    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (playlist.coverArtUrl) deleteFile(playlist.coverArtUrl);
      coverArtUrl = `/uploads/covers/${req.file.filename}`;
    }

    const updated = await prisma.playlist.update({
      where: { id: parseInt(id) },
      data: {
        title: title || playlist.title,
        description: description !== undefined ? description : playlist.description,
        coverArtUrl,
        isOnHomepage: isOnHomepage === 'true' || isOnHomepage === true,
        displayOrder: parseInt(displayOrder) || 0,
        category: category || playlist.category
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Lỗi updateSystemPlaylist:', error);
    res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
};

// [ADMIN] PUT /api/admin/system-playlists/reorder
// Body: { orderedIds: [1, 3, 2, 5, ...] }
const reorderSystemPlaylists = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds is required' });
    }

    const updates = orderedIds.map((playlistId, index) =>
      prisma.playlist.update({
        where: { id: parseInt(playlistId) },
        data: { displayOrder: index + 1 }
      })
    );

    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Đã cập nhật thứ tự playlist' });
  } catch (error) {
    console.error('Lỗi reorderSystemPlaylists:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// [ADMIN] POST /api/admin/system-playlists/:id/songs
const addSongToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    const existing = await prisma.playlistSong.findUnique({
      where: { playlistId_songId: { playlistId: parseInt(id), songId: parseInt(songId) } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Bài hát đã có trong playlist' });
    }

    const count = await prisma.playlistSong.count({ where: { playlistId: parseInt(id) } });

    await prisma.playlistSong.create({
      data: { playlistId: parseInt(id), songId: parseInt(songId), sortOrder: count + 1 }
    });
    res.json({ success: true, message: 'Đã thêm bài hát' });
  } catch (error) {
    console.error('Lỗi addSongToPlaylist:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// [ADMIN] DELETE /api/admin/system-playlists/:id/songs/:songId
const removeSongFromPlaylist = async (req, res) => {
  try {
    const { id, songId } = req.params;
    await prisma.playlistSong.delete({
      where: { playlistId_songId: { playlistId: parseInt(id), songId: parseInt(songId) } }
    });
    res.json({ success: true, message: 'Đã xóa bài hát khỏi playlist' });
  } catch (error) {
    console.error('Lỗi removeSongFromPlaylist:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// [ADMIN] PUT /api/admin/system-playlists/:id/songs/reorder
const reorderSongs = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderedSongIds } = req.body;

    const updates = orderedSongIds.map((songId, index) =>
      prisma.playlistSong.update({
        where: { playlistId_songId: { playlistId: parseInt(id), songId: parseInt(songId) } },
        data: { sortOrder: index + 1 }
      })
    );

    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Đã cập nhật thứ tự' });
  } catch (error) {
    console.error('Lỗi reorderSongs:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

module.exports = {
  getHomeSystemPlaylists,
  getAllSystemPlaylists,
  createSystemPlaylist,
  getSystemPlaylistById,
  updateSystemPlaylist,
  reorderSystemPlaylists,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderSongs
};
