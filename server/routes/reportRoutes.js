const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

// User tạo báo cáo (bắt buộc đăng nhập)
router.post('/api/reports', authMiddleware, reportController.createReport);

module.exports = router;
