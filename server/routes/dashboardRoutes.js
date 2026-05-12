const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/api/dashboard/stats', dashboardController.getStats);

module.exports = router;