const express = require('express');
const router = express.Router();
const { syncChartController, getChartHistory } = require('../controllers/adminChartController.js');

const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

router.post('/api/admin/charts/sync', authMiddleware, requireAdmin, syncChartController);
router.get('/api/admin/charts/history', authMiddleware, requireAdmin, getChartHistory);

module.exports = router;
