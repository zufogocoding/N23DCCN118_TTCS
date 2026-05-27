const express = require('express');
const router = express.Router();
const { wrapController } = require('../utils/asyncHandler');
const songController = wrapController(require('../controllers/songController'));
const { uploadSongFields: uploadFields } = require('../middlewares/uploadMiddleware');

const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const requireActiveArtist = require('../middlewares/requireActiveArtist');

// Định tuyến các yêu cầu vào routers xử lý
router.post('/api/songs/upload', authMiddleware, requireActiveArtist, uploadFields, songController.uploadSong);
router.get('/api/songs', songController.getAllSongs);
router.get('/api/songs/my-uploaded', authMiddleware, songController.getMyUploaded);
router.get('/api/songs/user/:userId', optionalAuthMiddleware, songController.getUserSongs);
router.get('/api/songs/:id', optionalAuthMiddleware, songController.getSongById);
router.put('/api/songs/:id', authMiddleware, requireActiveArtist, uploadFields, songController.updateSong);
router.delete('/api/songs/:id', authMiddleware, requireActiveArtist, songController.deleteSong);
module.exports = router;