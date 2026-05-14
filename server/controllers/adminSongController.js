const prisma = require("../db/index.js");

// Lấy bài pending (có include artist info)
const getPendingSongs = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      where: {
        status: "pending",
        isDeleted: false,
      },
      include: {
        artists: {
          include: {
            artist: {
              include: { user: { select: { username: true } } },
            },
          },
        },
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

// Đếm số bài pending (cho notification badge)
const getPendingCount = async (req, res) => {
  try {
    const count = await prisma.song.count({
      where: {
        status: "pending",
        isDeleted: false,
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

module.exports = {
  getPendingSongs,
  getPendingCount,
  approveSong,
  rejectSong,
};
