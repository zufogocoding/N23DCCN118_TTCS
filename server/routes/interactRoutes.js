// server/routes/interactRoutes.js
const express = require('express');
const router = express.Router();
const interactController = require('../controllers/interactController');

// POST /api/interactions/listen - Ghi nhận lịch sử nghe
router.post('/api/interactions/listen', interactController.trackListening);

// POST /api/interactions/like - Toggle Like / Unlike
router.post('/api/interactions/like', interactController.toggleLike);

// GET /api/interactions/like/:userId/:songId - Kiểm tra trạng thái like
router.get('/api/interactions/like/:userId/:songId', interactController.checkLikeStatus);

module.exports = router;
