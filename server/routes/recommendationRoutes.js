// server/routes/recommendationRoutes.js
const express = require('express');
const router = express.Router();
const { wrapController } = require('../utils/asyncHandler');
const recommendationController = wrapController(require('../controllers/recommendationController'));
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

// GET /api/recommendations - Lấy danh sách bài hát gợi ý cá nhân hóa (Yêu cầu đăng nhập)
router.get('/api/recommendations', authMiddleware, recommendationController.getRecommendations);

// GET /api/songs/:songId/similar - Lấy danh sách bài hát tương tự bài hát cụ thể (Công khai)
router.get('/api/songs/:songId/similar', recommendationController.getSimilarSongs);

// GET /api/admin/recommendations/train/status - Lấy trạng thái tiến trình huấn luyện gợi ý (Yêu cầu quyền Admin)
router.get('/api/admin/recommendations/train/status', authMiddleware, requireAdmin, recommendationController.getTrainingStatus);

// POST /api/admin/recommendations/train - Trigger tiến trình huấn luyện lại mô hình gợi ý (Yêu cầu quyền Admin)
router.post('/api/admin/recommendations/train', authMiddleware, requireAdmin, recommendationController.triggerTraining);

module.exports = router;
