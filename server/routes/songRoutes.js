const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const upload = require('../middlewares/uploadMiddleware'); // Nhúng bảo vệ vào

// Định tuyến các yêu cầu vào routers xử lý
router.post('/api/songs/upload', upload.single('audioFile'), songController.uploadSong);
router.get('/api/songs', songController.getAllSongs);
router.get('/api/songs/:id', songController.getSongById);
router.put('/api/songs/:id', songController.updateSong);
router.delete('/api/songs/:id', songController.deleteSong);

module.exports = router;