const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
 
// Tất cả routes đều cần auth + admin
router.use(authMiddleware, requireAdmin);
 
// Danh sách users (có search, filter, phân trang)
router.get('/', adminUserController.getAllUsers);
 
// Chi tiết 1 user
router.get('/:id', adminUserController.getUserById);
 
// Ban / Unban
router.put('/:id/ban', adminUserController.banUser);
router.put('/:id/unban', adminUserController.unbanUser);
 
// Promote / Demote admin
router.put('/:id/promote', adminUserController.promoteToAdmin);
router.put('/:id/demote', adminUserController.demoteAdmin);
 
// Xóa vĩnh viễn
router.delete('/:id', adminUserController.deleteUser);
 
module.exports = router;