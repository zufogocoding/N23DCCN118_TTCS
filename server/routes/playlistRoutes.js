const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');

router.post('/api/playlists', playlistController.createPlaylist);
router.post('/api/playlists/:id/songs', playlistController.addSongToPlaylist);
router.get('/api/playlists/:id', playlistController.getPlaylistById);

module.exports = router;