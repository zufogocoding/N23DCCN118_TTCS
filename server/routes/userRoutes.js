const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

// Lấy thông tin profile
router.get('/profile', authMiddleware, userController.getProfile);

// Cập nhật thông tin profile (hỗ trợ upload avatar)
router.put('/profile', authMiddleware, uploadAvatar.single('avatar'), userController.updateProfile);

module.exports = router;
