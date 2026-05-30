const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const requireActiveArtist = require('../middlewares/requireActiveArtist');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer cho artist profile images
const avatarDir = 'uploads/avatars';
const bannerDir = 'uploads/banners';

if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(bannerDir)) fs.mkdirSync(bannerDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'avatarFile') {
      cb(null, avatarDir);
    } else if (file.fieldname === 'bannerFile') {
      cb(null, bannerDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
};

const uploadProfileImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).fields([
  { name: 'avatarFile', maxCount: 1 },
  { name: 'bannerFile', maxCount: 1 },
]);

router.get('/api/artists/analytics', authMiddleware, requireActiveArtist, artistController.getAnalytics);
router.get('/api/artists/:id/followers', authMiddleware, artistController.getFollowers);
router.get('/api/artists/:id', optionalAuthMiddleware, artistController.getArtistProfile);
router.put('/api/artists/:id/profile', authMiddleware, requireActiveArtist, uploadProfileImages, artistController.updateArtistProfile);
router.post('/api/artists/:id/follow', authMiddleware, artistController.followArtist);
router.delete('/api/artists/:id/follow', authMiddleware, artistController.unfollowArtist);
router.post('/api/artists/:id/pin', authMiddleware, requireActiveArtist, artistController.pinSong);

module.exports = router;
