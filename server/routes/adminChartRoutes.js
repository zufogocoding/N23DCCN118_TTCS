const express = require('express');
const router = express.Router();
const { syncChartController, getChartHistory } = require('../controllers/adminChartController.js');

// Bạn có thể thêm middleware xác thực admin ở đây nếu có, ví dụ: router.post('/api/admin/charts/sync', isAdmin, syncChartController);
router.post('/api/admin/charts/sync', syncChartController);
router.get('/api/admin/charts/history', getChartHistory);

module.exports = router;
