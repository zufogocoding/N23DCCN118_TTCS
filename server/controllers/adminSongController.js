
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



// get all songs for admin management
const getAllSongs = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        artists: {
          include: {
            artist: {
              include: {
                user: {
                  select: {
                    displayName: true,
                    username: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(songs);
  } catch (error) {
    console.error("Lỗi getAllSongs:", error);
    res.status(500).json({ error: "Cannot get all songs" });
  }
};

// delete song permanently
const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.song.delete({
      where: {
        id: Number(id)
      }
    });

    res.json({ message: "Song deleted successfully" });
  } catch (error) {
    console.error("Lỗi deleteSong:", error);
    res.status(500).json({ error: "Delete song failed" });
  }
};

module.exports = {
  getPendingSongs,
  approveSong,
  rejectSong,
  getPendingCount,
  getAllSongs,
  deleteSong,
};
