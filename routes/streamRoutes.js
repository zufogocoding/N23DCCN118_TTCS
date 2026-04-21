// routes/streamRoutes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/api/songs/:id/stream', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);


    const song = await prisma.song.findUnique({
      where: { id: songId, isDeleted: false }
    });

    if (!song) return res.status(404).send('Không tìm thấy bài hát');


    const musicPath = path.join(__dirname, '..', song.audioUrl);
    const stat = fs.statSync(musicPath);
    const fileSize = stat.size;
    const range = req.headers.range;

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
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head); // 206: Partial Content
      file.pipe(res);
    } else {

      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(musicPath).pipe(res);
    }
  } catch (error) {
    res.status(500).send('Lỗi Server: ' + error.message);
  }
});
