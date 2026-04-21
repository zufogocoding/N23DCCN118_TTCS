const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const uploadDir = 'uploads/songs';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('mp3 and wav only!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.post('/api/songs/upload', upload.single('audioFile'), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: 'Choose 1 song to uploads' });
    }
    const savedAudioUrl = `/${req.file.path.replace(/\\/g, '/')}`;


    const { title, durationMs } = req.body;


    const newSong = await prisma.song.create({
      data: {
        title: title || 'NoName',
        durationMs: parseInt(durationMs) || 0,
        audioUrl: savedAudioUrl,
      }
    });

    res.status(201).json({
      message: 'Upload song success!',
      song: newSong
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message || 'Server side error' });
  }
});

module.exports = router;
