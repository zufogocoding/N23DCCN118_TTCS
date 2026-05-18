const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middlewares/authMiddleware');
const requireActiveArtist = require('../middlewares/requireActiveArtist');
const albumController = require('../controllers/albumController');

// Setup multer cho album cover upload
const albumCoverDir = 'uploads/album-covers';
if (!fs.existsSync(albumCoverDir)) fs.mkdirSync(albumCoverDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, albumCoverDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadAlbumCover = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([{ name: 'coverImage', maxCount: 1 }]);

// Public routes
router.get('/api/artists/:artistId/albums', albumController.listAlbumsByArtist);
router.get('/api/albums/:albumId', albumController.getAlbumById);

// Owner routes (requires auth + active artist)
router.get('/api/artists/:artistId/albums/all', authMiddleware, requireActiveArtist, albumController.listMyAlbums);
router.get('/api/albums/:albumId/manage', authMiddleware, requireActiveArtist, albumController.getAlbumManage);

router.post('/api/albums', authMiddleware, requireActiveArtist, uploadAlbumCover, albumController.createAlbum);
router.put('/api/albums/:albumId', authMiddleware, requireActiveArtist, uploadAlbumCover, albumController.updateAlbum);
router.delete('/api/albums/:albumId', authMiddleware, requireActiveArtist, albumController.deleteAlbum);

// Song management within album
router.post('/api/albums/:albumId/songs', authMiddleware, requireActiveArtist, albumController.addSongToAlbum);
router.delete('/api/albums/:albumId/songs/:songId', authMiddleware, requireActiveArtist, albumController.removeSongFromAlbum);
router.put('/api/albums/:albumId/reorder', authMiddleware, requireActiveArtist, albumController.reorderSongs);

// Release management
router.post('/api/albums/:albumId/release', authMiddleware, requireActiveArtist, albumController.releaseAlbum);
router.post('/api/albums/:albumId/schedule', authMiddleware, requireActiveArtist, albumController.scheduleAlbum);
router.post('/api/albums/:albumId/unschedule', authMiddleware, requireActiveArtist, albumController.unscheduleAlbum);

module.exports = router;
