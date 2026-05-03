const dashboardController = require('../controllers/dashboardController');
router.get('/api/dashboard/stats', dashboardController.getStats);