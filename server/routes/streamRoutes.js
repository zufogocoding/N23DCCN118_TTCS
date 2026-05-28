// routes/streamRoutes.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const prisma = require('../db/index.js')
const router = express.Router();

router.get('/api/songs/:id/stream', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);

    const song = await prisma.song.findUnique({
      where: { id: songId, isDeleted: false, status: 'approved' }
    });

    if (!song) return res.status(404).send('Không tìm thấy bài hát');

    // audioUrl có dạng "/uploads/songs/xxx.mp3" — cần bỏ dấu "/" đầu
    const cleanUrl = song.audioUrl.startsWith('/') ? song.audioUrl.slice(1) : song.audioUrl;
    const musicPath = path.join(__dirname, '..', cleanUrl);

    // Kiểm tra file tồn tại trước khi stream
    if (!fs.existsSync(musicPath)) {
      return res.status(404).send('File nhạc không tồn tại trên server');
    }

    const stat = fs.statSync(musicPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Detect content type
    const ext = path.extname(musicPath).toLowerCase();
    const contentType = ext === '.wav' ? 'audio/wav' : 'audio/mpeg';

    //Range request 
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const file = fs.createReadStream(musicPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };
      res.writeHead(206, head); // 206: Partial Content
      file.pipe(res);
    } else {

      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      };
      res.writeHead(200, head);
      fs.createReadStream(musicPath).pipe(res);
    }
  } catch (error) {
    console.error('Lỗi streaming:', error.message);
    res.status(500).send('Lỗi Server: ' + error.message);
  }
});

module.exports = router;
