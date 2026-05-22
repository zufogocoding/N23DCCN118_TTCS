// server/routes/interactRoutes.js
const express = require('express');
const router = express.Router();
const { wrapController } = require('../utils/asyncHandler');
const interactController = wrapController(require('../controllers/interactController'));
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/interactions/listen - Ghi nhận lịch sử nghe
router.post('/api/interactions/listen', authMiddleware, interactController.trackListening);

// POST /api/interactions/like - Toggle Like / Unlike
router.post('/api/interactions/like', authMiddleware, interactController.toggleLike);

// GET /api/interactions/like-status/:songId - Kiểm tra trạng thái like
router.get('/api/interactions/like-status/:songId', authMiddleware, interactController.checkLikeStatus);

// GET /api/interactions/liked - Lấy danh sách bài hát đã thích
router.get('/api/interactions/liked', authMiddleware, interactController.getLikedSongs);

// POST /api/interactions/like-status-batch - Kiểm tra hàng loạt trạng thái like
router.post('/api/interactions/like-status-batch', authMiddleware, interactController.batchCheckLikeStatus);

module.exports = router;
