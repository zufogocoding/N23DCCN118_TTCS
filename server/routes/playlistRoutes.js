const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');

// Tạo playlist mới
router.post('/api/playlists', playlistController.createPlaylist);

// Lấy danh sách playlist của 1 user
router.get('/api/playlists/user/:userId', playlistController.getUserPlaylists);

// Playlist nào của user đang chứa bài này (cho UI thêm vào playlist)
router.get(
  '/api/playlists/user/:userId/song/:songId/memberships',
  playlistController.getPlaylistIdsContainingSong
);

// Lấy chi tiết 1 playlist
router.get('/api/playlists/:id', playlistController.getPlaylistById);

// Cập nhật thông tin playlist (title, description, isPublic)
router.put('/api/playlists/:id', playlistController.updatePlaylist);

// Xóa playlist
router.delete('/api/playlists/:id', playlistController.deletePlaylist);

// Thêm bài hát vào playlist
router.post('/api/playlists/:id/songs', playlistController.addSongToPlaylist);

// Xóa bài hát khỏi playlist
router.delete('/api/playlists/:id/songs/:songId', playlistController.removeSongFromPlaylist);

module.exports = router;