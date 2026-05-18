const jwt = require('jsonwebtoken');

/**
 * Giống authMiddleware: chuẩn hóa req.user = { id } từ JWT { userId }.
 * Giữ tên verifyToken để tương thích các route đang import.
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    const userId = decoded.userId ?? decoded.id;
    if (userId == null) {
      return res.status(403).json({ message: 'Invalid token payload' });
    }
    req.user = { id: userId };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;