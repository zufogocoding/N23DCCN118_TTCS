// server/middlewares/roleMiddleware.js

/**
 * Middleware tổng quát để kiểm tra quyền hạn của người dùng dựa trên vai trò (RBAC).
 * Cho phép tự động vượt qua nếu người dùng là admin thông qua cờ isAdmin.
 * 
 * @param {string[]} allowedRoles - Danh sách các vai trò được phép truy cập (vd: ['artist', 'admin'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Xác thực thất bại, vui lòng đăng nhập" });
    }

    // Nếu là admin (thông qua cờ isAdmin), cho phép qua mọi quyền
    if (req.user.isAdmin) {
      return next();
    }

    const userRole = req.user.role || 'user';

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ error: "Bạn không có quyền thực hiện chức năng này" });
  };
};

/**
 * Middleware kiểm tra quyền Nghệ sĩ (Artist)
 */
const requireArtist = requireRole(['artist']);

module.exports = {
  requireRole,
  requireArtist
};
