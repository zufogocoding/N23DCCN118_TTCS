const prisma = require('../db/index');

const uploadSong = async (req, res) => {
  try {

    const {
      title,
      audioUrl,
      coverArtUrl,
      durationMs
    } = req.body;

    const song = await prisma.song.create({
      data: {
        title,
        audioUrl,
        coverArtUrl,
        durationMs,
        status: "pending"
      }
    });

    res.status(201).json(song);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Upload failed"
    });
  }
};

module.exports = {
  uploadSong
};