
const prisma = require("../db/index");
const { notifyFollowersAboutSingleRelease } = require("../services/notificationService");

// ── GET /api/admin/songs ─────────────────────────────────────────────────────
// Query params: page, limit, search, status, genreId, sortBy, sortOrder, dateFrom, dateTo
const getAllSongsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = "",
      status = "all",        // all | pending | approved | rejected
      genreId = "",
      sortBy = "createdAt",  // createdAt | title | playCount | durationMs
      sortOrder = "desc",    // asc | desc
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build WHERE
    const where = { isDeleted: false };

    if (status !== "all") where.status = status;

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { artistName: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (genreId) {
      where.genres = { some: { genreId: parseInt(genreId) } };
    }

    // Date range filter on createdAt
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Build ORDER BY
    const allowedSortFields = ["createdAt", "title", "playCount", "durationMs"];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const finalSortOrder = sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [finalSortBy]: finalSortOrder };

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          genres: { include: { genre: true } },
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
              },
            },
          },
          _count: { select: { interactions: true } },
        },
      }),
      prisma.song.count({ where }),
    ]);

    res.json({
      songs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getAllSongsAdmin error:", error);
    res.status(500).json({ error: "Không lấy được danh sách bài hát" });
  }
};

// ── PATCH /api/admin/songs/:id/visibility ────────────────────────────────────
// Toggle between approved (visible) <-> hidden (custom status)
const toggleSongVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await prisma.song.findFirst({
      where: { id: Number(id), isDeleted: false },
    });
    if (!song) return res.status(404).json({ error: "Không tìm thấy bài hát" });

    const newStatus = song.status === "approved" ? "hidden" : "approved";
    const updated = await prisma.song.update({
      where: { id: Number(id) },
      data: { status: newStatus },
    });
    res.json({ message: `Đã ${newStatus === "approved" ? "hiện" : "ẩn"} bài hát`, song: updated });
  } catch (error) {
    console.error("toggleSongVisibility error:", error);
    res.status(500).json({ error: "Không thể thay đổi trạng thái" });
  }
};

// ── DELETE /api/admin/songs/:id ──────────────────────────────────────────────
// Hard (soft) delete: admin forced delete
const adminDeleteSong = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await prisma.song.findFirst({ where: { id: Number(id), isDeleted: false } });
    if (!song) return res.status(404).json({ error: "Không tìm thấy bài hát" });

    await prisma.song.update({ where: { id: Number(id) }, data: { isDeleted: true } });
    res.json({ message: "Đã xóa bài hát khỏi hệ thống" });
  } catch (error) {
    console.error("adminDeleteSong error:", error);
    res.status(500).json({ error: "Không thể xóa bài hát" });
  }
};

// ── PATCH /api/admin/songs/:id/status ───────────────────────────────────────
// Set explicit status: approved | rejected | pending | hidden
const setAdminSongStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["approved", "rejected", "pending", "hidden"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    const song = await prisma.song.findFirst({ where: { id: Number(id), isDeleted: false } });
    if (!song) return res.status(404).json({ error: "Không tìm thấy bài hát" });

    const updated = await prisma.song.update({ where: { id: Number(id) }, data: { status } });
    res.json({ message: "Đã cập nhật trạng thái", song: updated });
  } catch (error) {
    console.error("setAdminSongStatus error:", error);
    res.status(500).json({ error: "Không thể cập nhật trạng thái" });
  }
};

// ── GET /api/admin/songs/pending ─────────────────────────────────────────────
const getPendingSongs = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Cannot get pending songs" });
  }
};

// ── PATCH /api/admin/song/:id/approve ───────────────────────────────────────
const approveSong = async (req, res) => {
  try {
    const { id } = req.params;
    const songId = Number(id);
    const existing = await prisma.song.findFirst({
      where: { id: songId, isDeleted: false },
      select: { status: true, title: true, uploadedById: true },
    });

    if (!existing) return res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t" });

    let notificationCount = 0;
    const song = await prisma.$transaction(async (tx) => {
      const updated = await tx.song.update({
        where: { id: songId },
        data: { status: "approved" },
      });

      if (existing.status !== "approved") {
        if (existing.uploadedById) {
          await tx.notification.create({
            data: {
              userId: existing.uploadedById,
              type: "song_approved",
              message: `Bài hát "${existing.title}" của bạn đã được duyệt và có thể nghe công khai.`,
              targetType: "SONG",
              targetId: songId,
              actionUrl: `/song/${songId}`,
            },
          });
        }
        notificationCount = await notifyFollowersAboutSingleRelease(tx, songId);
      }

      return updated;
    });
    console.log(`[Notification] Created ${notificationCount} new_song notifications for song ${songId}`);

    res.json(song);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Approve failed" });
  }
};

// ── PATCH /api/admin/song/:id/reject ────────────────────────────────────────
const rejectSong = async (req, res) => {
  try {
    const { id } = req.params;
    const songId = Number(id);
    const existing = await prisma.song.findFirst({
      where: { id: songId, isDeleted: false },
      select: { title: true, uploadedById: true },
    });

    if (!existing) return res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t" });

    const song = await prisma.$transaction(async (tx) => {
      const updated = await tx.song.update({
        where: { id: songId },
        data: { status: "rejected" },
      });

      if (existing.uploadedById) {
        await tx.notification.create({
          data: {
            userId: existing.uploadedById,
            type: "song_rejected",
            message: `Bài hát "${existing.title}" của bạn đã bị từ chối. Vui lòng kiểm tra lại nội dung trước khi gửi lại.`,
            targetType: "SONG",
            targetId: songId,
            actionUrl: "/upload-song",
          },
        });
      }

      return updated;
    });

    res.json(song);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Reject failed" });
  }
};

// ── GET /api/admin/songs/pending/count ──────────────────────────────────────
const getPendingCount = async (req, res) => {
  try {
    const count = await prisma.song.count({ where: { status: "pending" } });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Cannot get pending count" });
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


const adminUpdateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artistName, tempo, energy, danceability, status, genreIds } = req.body;
    
    const songId = parseInt(id);
    const existing = await prisma.song.findFirst({
      where: { id: songId, isDeleted: false }
    });
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (artistName !== undefined) data.artistName = artistName || null;
    if (tempo !== undefined) data.tempo = parseFloat(tempo) || null;
    if (energy !== undefined) data.energy = parseFloat(energy) || null;
    if (danceability !== undefined) data.danceability = parseFloat(danceability) || null;
    if (status !== undefined) {
      const allowed = ["approved", "rejected", "pending", "hidden"];
      if (allowed.includes(status)) {
        data.status = status;
      }
    }

    // Handle genre updates if provided
    if (genreIds !== undefined) {
      let parsedGenreIds = [];
      try {
        let parsed = typeof genreIds === 'string' ? JSON.parse(genreIds) : genreIds;
        if (!Array.isArray(parsed)) parsed = [parsed];
        parsedGenreIds = parsed.map(gId => parseInt(gId)).filter(gId => !isNaN(gId));
      } catch {
        // ignore
      }

      await prisma.songGenre.deleteMany({ where: { songId } });
      if (parsedGenreIds.length > 0) {
        await prisma.songGenre.createMany({
          data: parsedGenreIds.map(genreId => ({ songId, genreId })),
        });
      }
    }

    const updated = await prisma.song.update({
      where: { id: songId },
      data,
      include: {
        genres: { include: { genre: true } },
        artists: {
          include: {
            artist: {
              include: { user: { select: { username: true, displayName: true } } }
            }
          }
        }
      }
    });

    res.json({ message: "Admin đã cập nhật bài hát thành công", song: updated });
  } catch (error) {
    console.error("adminUpdateSong error:", error);
    res.status(500).json({ error: "Không thể chỉnh sửa bài hát" });
  }
};

module.exports = {
  getAllSongsAdmin,
  toggleSongVisibility,
  adminDeleteSong,
  setAdminSongStatus,
  getPendingSongs,
  approveSong,
  rejectSong,
  getPendingCount,
  getAllSongs,
  deleteSong,
  adminUpdateSong,
};
