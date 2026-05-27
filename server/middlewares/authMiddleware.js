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

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Vui lòng đăng nhập để thực hiện chức năng này" });
    }

    const token = authHeader.split(' ')[1];

    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId ?? decoded.id;
    if (userId == null) {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, isAdmin: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: "Tài khoản không tồn tại hoặc đã bị xóa" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Lỗi xác thực token:", error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });
    }
    return res.status(401).json({ error: "Xác thực thất bại, token không hợp lệ" });
  }
};

module.exports = authMiddleware;
