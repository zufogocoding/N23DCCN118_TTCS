const prisma = require('../db/index');

const adminAlbumController = {
  /**
   * GET /api/admin/albums
   * Lấy toàn bộ albums với filter, search, pagination
   * Query: page, limit, search, status, type, sortBy, sortOrder, dateFrom, dateTo
   */
  listAlbums: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 15,
        search = '',
        status = 'all',
        type = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where = {};

      // Status filter (all | draft | scheduled | released | banned)
      if (status !== 'all') {
        where.status = status;
      }

      // Type filter (all | Single | EP | Album | Mixtape)
      if (type !== 'all') {
        where.type = type;
      }

      // Date range filter (createdAt)
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
      }

      // Search by album title or artist name
      if (search.trim()) {
        where.OR = [
          { title: { contains: search.trim(), mode: 'insensitive' } },
          {
            artist: {
              user: {
                OR: [
                  { displayName: { contains: search.trim(), mode: 'insensitive' } },
                  { username: { contains: search.trim(), mode: 'insensitive' } },
                ],
              },
            },
          },
        ];
      }

      // Sort mapping
      const ALLOWED_SORT = ['createdAt', 'releasedDate', 'title'];
      const orderField = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';
      const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';
      const orderBy = { [orderField]: orderDir };

      const [albums, total] = await Promise.all([
        prisma.album.findMany({
          where,
          skip,
          take: limitNum,
          orderBy,
          include: {
            artist: {
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
            },
            _count: {
              select: { songs: true },
            },
          },
        }),
        prisma.album.count({ where }),
      ]);

      const result = albums.map((al) => ({
        id: al.id,
        title: al.title,
        type: al.type,
        coverArtUrl: al.coverArtUrl,
        status: al.status,
        releasedDate: al.releasedDate,
        scheduledAt: al.scheduledAt,
        createdAt: al.createdAt,
        songCount: al._count.songs,
        artist: {
          id: al.artist.userId,
          displayName: al.artist.user.displayName,
          username: al.artist.user.username,
          avatarUrl: al.artist.user.avatarUrl,
        },
      }));

      res.json({
        albums: result,
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (e) {
      console.error('adminListAlbums:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /**
   * GET /api/admin/albums/:albumId
   * Chi tiết album kèm danh sách tracks (bao gồm tất cả status)
   */
  getAlbumDetail: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findUnique({
        where: { id: albumId },
        include: {
          artist: {
            include: {
              user: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
            },
          },
          songs: {
            where: { song: { isDeleted: false } },
            orderBy: { position: 'asc' },
            include: {
              song: {
                include: {
                  artists: {
                    include: {
                      artist: {
                        include: {
                          user: { select: { username: true, displayName: true } },
                        },
                      },
                    },
                  },
                  genres: { include: { genre: true } },
                },
              },
            },
          },
        },
      });

      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });

      const tracks = album.songs.map((as) => as.song).filter(Boolean);
      const approvedCount = tracks.filter((s) => s.status === 'approved').length;
      const pendingCount = tracks.filter((s) => s.status === 'pending').length;
      const rejectedCount = tracks.filter((s) => s.status === 'rejected').length;

      res.json({
        album: {
          id: album.id,
          title: album.title,
          type: album.type,
          coverArtUrl: album.coverArtUrl,
          status: album.status,
          releasedDate: album.releasedDate,
          scheduledAt: album.scheduledAt,
          createdAt: album.createdAt,
          artistId: album.artistId,
          artist: {
            id: album.artist.userId,
            displayName: album.artist.user.displayName,
            username: album.artist.user.username,
            avatarUrl: album.artist.user.avatarUrl,
          },
        },
        tracks,
        stats: { total: tracks.length, approvedCount, pendingCount, rejectedCount },
      });
    } catch (e) {
      console.error('adminGetAlbumDetail:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /**
   * PATCH /api/admin/albums/:albumId/takedown
   * Gỡ album (soft delete): đổi status → "banned"
   * Không xóa dữ liệu, chỉ ẩn khỏi tất cả public queries
   */
  takedownAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findUnique({ where: { id: albumId } });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'banned') {
        return res.status(400).json({ error: 'Album đã bị gỡ bỏ rồi' });
      }

      const { reason } = req.body;

      const updated = await prisma.$transaction(async (tx) => {
        const nextAlbum = await tx.album.update({
          where: { id: albumId },
          data: { status: 'banned' },
        });

        await tx.notification.create({
          data: {
            userId: album.artistId,
            type: 'album_takedown',
            message: `Album "${album.title}" của bạn đã bị gỡ khỏi hệ thống.${reason ? ` Lý do: ${reason}` : ''}`,
            targetType: 'ALBUM',
            targetId: albumId,
            actionUrl: `/release/${albumId}`,
          },
        });

        return nextAlbum;
      });

      console.log(`[ADMIN TAKEDOWN] Album #${albumId} "${album.title}" — Admin #${req.user.id}${reason ? ` — Lý do: ${reason}` : ''}`);

      res.json({
        message: `Album "${album.title}" đã bị gỡ bỏ`,
        album: updated,
      });
    } catch (e) {
      console.error('adminTakedownAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /**
   * PATCH /api/admin/albums/:albumId/restore
   * Khôi phục album đã bị gỡ → trả về status "released"
   */
  restoreAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findUnique({ where: { id: albumId } });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status !== 'banned') {
        return res.status(400).json({ error: 'Chỉ có thể khôi phục album đang bị gỡ bỏ' });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const nextAlbum = await tx.album.update({
          where: { id: albumId },
          data: { status: 'released' },
        });

        await tx.notification.create({
          data: {
            userId: album.artistId,
            type: 'album_restored',
            message: `Album "${album.title}" của bạn đã được khôi phục.`,
            targetType: 'ALBUM',
            targetId: albumId,
            actionUrl: `/album/${albumId}`,
          },
        });

        return nextAlbum;
      });

      console.log(`[ADMIN RESTORE] Album #${albumId} "${album.title}" — Admin #${req.user.id}`);

      res.json({
        message: `Album "${album.title}" đã được khôi phục`,
        album: updated,
      });
    } catch (e) {
      console.error('adminRestoreAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },
};

module.exports = adminAlbumController;
