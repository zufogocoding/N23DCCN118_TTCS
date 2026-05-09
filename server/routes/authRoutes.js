const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/api/auth/register-otp', authController.requestRegisterOtp);
router.post('/api/auth/signup', authController.signup);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/forgot-password-otp', authController.requestForgotPasswordOtp);
router.post('/api/auth/reset-password', authController.resetPassword);

module.exports = router;