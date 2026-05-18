const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Vui lòng đăng nhập để thực hiện chức năng này" });
    }

    const token = authHeader.split(' ')[1];
    
    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

    const userId = decoded.userId ?? decoded.id;
    if (userId == null) {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    req.user = {
      id: userId
    };

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
