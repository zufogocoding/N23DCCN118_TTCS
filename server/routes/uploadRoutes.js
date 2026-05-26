const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const uploadController = require('../controllers/uploadController');

// BUG FIX: Thêm authMiddleware để chỉ user đã đăng nhập mới upload được
router.post('/api/upload/song', authMiddleware, uploadController.uploadSong);

module.exports = router;
