const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET env variable is missing!");
  process.exit(1);
}

/** Đặt req.user = { id } nếu có Bearer hợp lệ; ngược lại req.user = null (không trả 401). */
function optionalAuthMiddleware(req, res, next) {
  req.user = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId ?? decoded.id;
    if (id != null) req.user = { id };
  } catch (_) {
    req.user = null;
  }
  next();
}

module.exports = optionalAuthMiddleware;
