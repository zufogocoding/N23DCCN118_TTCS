const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireActiveArtist = require('../middlewares/requireActiveArtist');
const albumController = require('../controllers/albumController');

router.get('/api/artists/:artistId/albums', albumController.listAlbumsByArtist);

router.get('/api/albums/:albumId', albumController.getAlbumById);

router.post('/api/albums', authMiddleware, requireActiveArtist, albumController.createAlbum);
router.put('/api/albums/:albumId', authMiddleware, requireActiveArtist, albumController.updateAlbum);
router.delete('/api/albums/:albumId', authMiddleware, requireActiveArtist, albumController.deleteAlbum);
router.post('/api/albums/:albumId/songs', authMiddleware, requireActiveArtist, albumController.addSongToAlbum);
router.delete('/api/albums/:albumId/songs/:songId', authMiddleware, requireActiveArtist, albumController.removeSongFromAlbum);

module.exports = router;
