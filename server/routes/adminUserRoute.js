const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const authMiddleware = require('../middlewares/authMiddleware');
 
// Middleware kiểm tra admin cho tất cả routes trong file này
const requireAdmin = async (req, res, next) => {
  try {
    const prisma = require('../db/index');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true },
    });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi xác thực quyền' });
  }
};
 
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