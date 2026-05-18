const express = require('express');
const router = express.Router();
const prisma = require('../db/index');
const songController = require('../controllers/songController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require("../middleware/verifyToken");
// Setup multer cho multi-file upload (audio + cover image)
const uploadDir = 'uploads/songs';
const coverDir = 'uploads/covers';

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'audioFile') {
      cb(null, uploadDir);
    } else if (file.fieldname === 'coverImage') {
      cb(null, coverDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audioFile' && file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else if (file.fieldname === 'coverImage' && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('File không hợp lệ!'), false);
  }
};

const uploadFields = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

const authMiddleware = require('../middlewares/authMiddleware');

// Định tuyến các yêu cầu vào routers xử lý
router.post('/api/songs/upload', authMiddleware, uploadFields, songController.uploadSong);
router.get('/api/songs', songController.getAllSongs);
router.get('/api/songs/:id', songController.getSongById);
router.put('/api/songs/:id', songController.updateSong);
router.delete('/api/songs/:id', songController.deleteSong);


//libary bai hat dang tai
router.get("/api/songs/my-uploaded",verifyToken,async(req,res)=>{

const songs = await prisma.song.findMany({
      where: {
        uploadedById: req.user.id
      }
});

      res.json(songs);

})

router.get(
   "/api/songs/user/:userId",
   songController.getUserSongs
);
module.exports = router;