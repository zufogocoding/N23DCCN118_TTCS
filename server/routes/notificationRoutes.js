const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Lấy danh sách thông báo
router.get('/', authMiddleware, notificationController.getNotifications);

// Đánh dấu 1 thông báo đã đọc
router.put('/:id/read', authMiddleware, notificationController.markAsRead);

// Đánh dấu tất cả đã đọc
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;
