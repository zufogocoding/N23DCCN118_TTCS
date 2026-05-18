const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');

router.get('/api/artists/:id', optionalAuthMiddleware, artistController.getArtistProfile);
router.put('/api/artists/:id/profile', authMiddleware, artistController.updateArtistProfile);
router.post('/api/artists/:id/follow', authMiddleware, artistController.followArtist);
router.delete('/api/artists/:id/follow', authMiddleware, artistController.unfollowArtist);

module.exports = router;
