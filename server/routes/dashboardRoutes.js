console.log("dashboard routes loaded");
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/api/dashboard/stats', dashboardController.getStats);
router.get('/api/dashboard/users', dashboardController.getUsers);
router.get('/api/dashboard/songs', dashboardController.getSongs);
router.get('/api/dashboard/streaming-stats', dashboardController.getStreamingStats);
router.get('/api/dashboard/recent-activities', dashboardController.getRecentActivities);

module.exports = router;