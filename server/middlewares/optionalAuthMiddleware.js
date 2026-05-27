const jwt = require('jsonwebtoken');

const prisma = require('../db/index');

// BUG FIX: Load dotenv để process.env.JWT_SECRET có giá trị
try {
  require('dotenv').config();
} catch (_) {
  // dotenv có thể không được cài, bỏ qua
}

if (!process.env.JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET env variable is missing!");
  process.exit(1);
}

/** Đặt req.user = { id, isActive, isAdmin, role } nếu có Bearer hợp lệ và hoạt động; ngược lại req.user = null. */
async function optionalAuthMiddleware(req, res, next) {
  req.user = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId ?? decoded.id;
    if (id != null) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, isActive: true, isAdmin: true, role: true }
      });
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (_) {
    req.user = null;
  }
  next();
}

module.exports = optionalAuthMiddleware;
