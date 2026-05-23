const express = require('express');
const router = express.Router();
const adminReportController = require('../controllers/adminReportController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

router.use(authMiddleware, requireAdmin);

router.get('/api/admin/reports', adminReportController.getReports);
router.put('/api/admin/reports/:id/resolve', adminReportController.resolveReport);
router.put('/api/admin/reports/:id/reject', adminReportController.rejectReport);

module.exports = router;
