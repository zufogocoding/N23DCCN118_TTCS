const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate, registerSchema, loginSchema } = require('../validators');

// Rate limiter for sensitive auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Apply rate limiter to all unauthenticated / sensitive endpoints
router.post('/api/auth/register-otp', authLimiter, authController.requestRegisterOtp);
router.post('/api/auth/signup', authLimiter, validate(registerSchema), authController.signup);
router.post('/api/auth/login', authLimiter, validate(loginSchema), authController.login);
router.post('/api/auth/forgot-password-otp', authLimiter, authController.requestForgotPasswordOtp);
router.post('/api/auth/reset-password', authLimiter, authController.resetPassword);

// API yêu cầu xác thực
router.get('/api/auth/me', authMiddleware, authController.getMe);
router.put('/api/auth/change-password', authMiddleware, authController.changePassword);
router.delete('/api/auth/delete-account', authMiddleware, authController.deleteAccount);

module.exports = router;