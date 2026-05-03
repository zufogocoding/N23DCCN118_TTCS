const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/api/auth/signup', authController.signup);
router.post('/api/auth/login', authController.login);

module.exports = router;