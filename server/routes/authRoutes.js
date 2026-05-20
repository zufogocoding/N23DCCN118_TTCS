const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const verifyToken = require('../middlewares/verifyToken');

router.post('/api/auth/register-otp', authController.requestRegisterOtp);
router.post('/api/auth/signup', authController.signup);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/forgot-password-otp', authController.requestForgotPasswordOtp);
router.post('/api/auth/reset-password', authController.resetPassword);

// API yêu cầu xác thực
router.put('/api/auth/change-password', verifyToken, authController.changePassword);
router.delete('/api/auth/delete-account', verifyToken, authController.deleteAccount);

module.exports = router;