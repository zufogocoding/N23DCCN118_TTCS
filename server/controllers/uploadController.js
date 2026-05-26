const prisma = require('../db/index');

const uploadSong = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để upload' });
    }

    const {
      title,
      audioUrl,
      coverArtUrl,
      durationMs
    } = req.body;

    if (!title || !audioUrl || !durationMs) {
      return res.status(400).json({ error: 'Thiếu thông tin bài hát (title, audioUrl, durationMs)' });
    }

    // Kiểm tra user có là artist không
    const existingArtist = await prisma.artist.findUnique({ where: { userId } });

    const songData = {
      title,
      audioUrl,
      coverArtUrl,
      durationMs: parseInt(durationMs, 10) || 0,
      status: "pending",
      uploadedById: userId
    };

    // Nếu user là artist, liên kết bài hát với artist
    if (existingArtist) {
      songData.artists = {
        create: {
          artistId: userId
        }
      };
    }

    const song = await prisma.song.create({ data: songData });

    res.status(201).json(song);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: "Upload failed"
    });
  }
};

module.exports = {
  uploadSong
};
