const express = require('express');
const router = express.Router();
const { wrapController } = require('../utils/asyncHandler');
const playlistController = wrapController(require('../controllers/playlistController'));
const { uploadPlaylistCover } = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');

// Tạo playlist mới
router.post('/api/playlists', authMiddleware, uploadPlaylistCover.single('cover'), playlistController.createPlaylist);

router.get('/api/playlists/system', playlistController.getSystemPlaylists);

// Lấy danh sách playlist của 1 user
router.get('/api/playlists/user/:userId', authMiddleware, playlistController.getUserPlaylists);

// Playlist nào của user đang chứa bài này (cho UI thêm vào playlist)
router.get(
  '/api/playlists/user/:userId/song/:songId/memberships',
  authMiddleware,
  playlistController.getPlaylistIdsContainingSong
);

// Lấy chi tiết 1 playlist (sử dụng optionalAuthMiddleware để kiểm tra playlist private)
router.get('/api/playlists/:id', optionalAuthMiddleware, playlistController.getPlaylistById);

// Cập nhật thông tin playlist (title, description, isPublic)
router.put('/api/playlists/:id', authMiddleware, uploadPlaylistCover.single('cover'), playlistController.updatePlaylist);

// Xóa playlist
router.delete('/api/playlists/:id', authMiddleware, playlistController.deletePlaylist);

// Thêm bài hát vào playlist
router.post('/api/playlists/:id/songs', authMiddleware, playlistController.addSongToPlaylist);

// Xóa bài hát khỏi playlist
router.delete('/api/playlists/:id/songs/:songId', authMiddleware, playlistController.removeSongFromPlaylist);

module.exports = router;