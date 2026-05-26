const express = require('express');
const router = express.Router();
const { wrapController } = require('../utils/asyncHandler');
const songController = wrapController(require('../controllers/songController'));
const { uploadSongFields: uploadFields } = require('../middlewares/uploadMiddleware');

const authMiddleware = require('../middlewares/authMiddleware');

// Định tuyến các yêu cầu vào routers xử lý
router.post('/api/songs/upload', authMiddleware, uploadFields, songController.uploadSong);
router.get('/api/songs', songController.getAllSongs);
router.get('/api/songs/my-uploaded', authMiddleware, songController.getMyUploaded);
router.get('/api/songs/user/:userId', songController.getUserSongs);
router.get('/api/songs/:id', songController.getSongById);
router.put('/api/songs/:id', authMiddleware, uploadFields, songController.updateSong);
router.delete('/api/songs/:id', authMiddleware, songController.deleteSong);
module.exports = router;