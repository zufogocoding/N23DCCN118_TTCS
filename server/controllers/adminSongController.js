const prisma = require("../db/index");

// lấy bài pending
const getPendingSongs = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      where: {
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(songs);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Cannot get pending songs",
    });
  }
};

// approve
const approveSong = async (req, res) => {
  try {
    const { id } = req.params;

    const song = await prisma.song.update({
      where: {
        id: Number(id),
      },
      data: {
        status: "approved",
      },
    });

    res.json(song);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Approve failed",
    });
  }
};

// reject
const rejectSong = async (req, res) => {
  try {
    const { id } = req.params;

    const song = await prisma.song.update({
      where: {
        id: Number(id),
      },
      data: {
        status: "rejected",
      },
    });

    res.json(song);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Reject failed",
    });
  }
};
// get count pending
const getPendingCount = async (req, res) => {
  try {
    const count = await prisma.song.count({
      where: {
        status: "pending",
      },
    });

    res.json({ count });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Cannot get pending count",
    });
  }
};

module.exports = {
  getPendingSongs,
  approveSong,
  rejectSong,
  getPendingCount,
};