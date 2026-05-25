const express = require('express');
const router = express.Router();
const adminReportController = require('../controllers/adminReportController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

router.get('/api/admin/reports', authMiddleware, requireAdmin, adminReportController.getReports);
router.put('/api/admin/reports/:id/resolve', authMiddleware, requireAdmin, adminReportController.resolveReport);
router.put('/api/admin/reports/:id/reject', authMiddleware, requireAdmin, adminReportController.rejectReport);

module.exports = router;
