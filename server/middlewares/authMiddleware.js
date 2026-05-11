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
    
    // Gắn thông tin userId vào req để các controller phía sau sử dụng
    req.user = {
      id: decoded.userId
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
