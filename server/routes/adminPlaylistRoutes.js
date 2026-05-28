const express = require('express');
const router = express.Router();
const { getAllPlaylists, deletePlaylist, createSystemPlaylist, toggleSystemPlaylistVisibility } = require('../controllers/adminPlaylistController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const { uploadPlaylistCover } = require('../middlewares/uploadMiddleware');

// Lấy danh sách System Playlist
router.get('/api/admin/playlists', authMiddleware, requireAdmin, getAllPlaylists);

// Tạo System Playlist mới
router.post('/api/admin/playlists', authMiddleware, requireAdmin, uploadPlaylistCover.single('cover'), createSystemPlaylist);

// Đổi trạng thái hiển thị
router.patch('/api/admin/playlists/:id/toggle-visibility', authMiddleware, requireAdmin, toggleSystemPlaylistVisibility);

// Xóa Playlist
router.delete('/api/admin/playlists/:id', authMiddleware, requireAdmin, deletePlaylist);

module.exports = router;
