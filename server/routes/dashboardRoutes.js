console.log("dashboard routes loaded");
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const dashboardController = require('../controllers/dashboardController');

router.get('/api/dashboard/stats', authMiddleware, requireAdmin, dashboardController.getStats);
router.get('/api/dashboard/users', authMiddleware, requireAdmin, dashboardController.getUsers);
router.get('/api/dashboard/songs', authMiddleware, requireAdmin, dashboardController.getSongs);
router.get('/api/dashboard/streaming-stats', authMiddleware, requireAdmin, dashboardController.getStreamingStats);
router.get('/api/dashboard/recent-activities', authMiddleware, requireAdmin, dashboardController.getRecentActivities);

module.exports = router;