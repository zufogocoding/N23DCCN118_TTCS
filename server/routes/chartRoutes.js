const express = require('express');
const router = express.Router();
const { getChartByType } = require('../controllers/chartController.js');

// Public route cho user và admin xem chart
router.get('/api/charts/:chartType', getChartByType);

module.exports = router;
