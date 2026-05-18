const prisma = require('../db/index');

async function requireActiveArtist(req, res, next) {
  try {
    const artist = await prisma.artist.findUnique({ where: { userId: req.user.id } });
    if (!artist || artist.status !== 'active') {
      return res.status(403).json({ error: 'Chỉ nghệ sĩ hoạt động mới thực hiện được thao tác này' });
    }
    req.artist = artist;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireActiveArtist;
