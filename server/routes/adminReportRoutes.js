const express = require('express');
const router = express.Router();
const adminReportController = require('../controllers/adminReportController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/api/admin/reports', authMiddleware, adminReportController.getReports);
router.put('/api/admin/reports/:id/resolve', authMiddleware, adminReportController.resolveReport);
router.put('/api/admin/reports/:id/reject', authMiddleware, adminReportController.rejectReport);

module.exports = router;
