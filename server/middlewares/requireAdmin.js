const prisma = require('../db/index');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện chức năng này' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true },
    });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
    }
    next();
  } catch (err) {
    console.error('Lỗi xác thực requireAdmin:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác thực quyền admin' });
  }
};

module.exports = requireAdmin;
