const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate, registerSchema, loginSchema } = require('../validators');

router.post('/api/auth/register-otp', authController.requestRegisterOtp);
router.post('/api/auth/signup', validate(registerSchema), authController.signup);
router.post('/api/auth/login', validate(loginSchema), authController.login);
router.post('/api/auth/forgot-password-otp', authController.requestForgotPasswordOtp);
router.post('/api/auth/reset-password', authController.resetPassword);

// API yêu cầu xác thực
router.put('/api/auth/change-password', authMiddleware, authController.changePassword);
router.delete('/api/auth/delete-account', authMiddleware, authController.deleteAccount);

module.exports = router;