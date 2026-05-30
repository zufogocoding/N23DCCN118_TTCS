const prisma = require('../db/index');
const path = require('path');
const { notifyFollowersAboutAlbumRelease } = require('../services/notificationService');

const songListInclude = {
  artists: {
    include: {
      artist: {
        include: { user: { select: { username: true, displayName: true } } },
      },
    },
  },
};

const albumController = {
  /** GET /api/albums — public, get all released albums */
  getAllPublicAlbums: async (req, res) => {
    try {
      const albums = await prisma.album.findMany({
        where: { status: 'released', artist: { status: 'active' } },
        orderBy: { releasedDate: 'desc' },
        include: {
          artist: {
            include: {
              user: { select: { username: true, displayName: true } }
            }
          }
        }
      });
      res.json(albums);
    } catch (e) {
      console.error('getAllPublicAlbums:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** GET /api/artists/:artistId/albums — public, artist phải active */
  listAlbumsByArtist: async (req, res) => {
    try {
      const artistId = parseInt(req.params.artistId, 10);
      if (Number.isNaN(artistId)) {
        return res.status(400).json({ error: 'ID không hợp lệ' });
      }

      const artist = await prisma.artist.findFirst({
        where: { userId: artistId, status: 'active' },
        include: {
          albums: {
            where: { status: 'released' },
            orderBy: { releasedDate: 'desc' },
            include: {
              songs: {
                where: { song: { isDeleted: false, status: 'approved' } },
                orderBy: { position: 'asc' },
                include: {
                  song: {
                    include: songListInclude,
                  },
                },
              },
            },
          },
        },
      });

      if (!artist) {
        return res.status(404).json({ error: 'Không tìm thấy nghệ sĩ' });
      }

      const albums = artist.albums.map((al) => ({
        id: al.id,
        title: al.title,
        type: al.type,
        coverArtUrl: al.coverArtUrl,
        releasedDate: al.releasedDate,
        createdAt: al.createdAt,
        status: al.status,
        tracks: al.songs.map((as) => as.song).filter(Boolean),
      }));

      res.json({ albums });
    } catch (e) {
      console.error('listAlbumsByArtist:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** GET /api/artists/:artistId/albums/all — owner only, includes drafts & scheduled */
  listMyAlbums: async (req, res) => {
    try {
      const artistId = parseInt(req.params.artistId, 10);
      if (req.user.id !== artistId) {
        return res.status(403).json({ error: 'Không có quyền' });
      }

      const albums = await prisma.album.findMany({
        where: { artistId },
        orderBy: { createdAt: 'desc' },
        include: {
          songs: {
            where: { song: { isDeleted: false } },
            orderBy: { position: 'asc' },
            include: {
              song: {
                include: songListInclude,
              },
            },
          },
        },
      });

      const result = albums.map((al) => ({
        id: al.id,
        title: al.title,
        type: al.type,
        coverArtUrl: al.coverArtUrl,
        releasedDate: al.releasedDate,
        scheduledAt: al.scheduledAt,
        status: al.status,
        createdAt: al.createdAt,
        tracks: al.songs.map((as) => as.song).filter(Boolean),
      }));

      res.json({ albums: result });
    } catch (e) {
      console.error('listMyAlbums:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** POST /api/albums — create album (draft) with optional cover image upload */
  createAlbum: async (req, res) => {
    try {
      const { title, type, scheduledAt } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Thiếu tiêu đề album' });
      }

      // Handle cover image file upload
      const coverFile = req.files?.coverImage?.[0];
      const coverArtUrl = coverFile
        ? `/${path.relative(process.cwd(), coverFile.path).replace(/\\/g, '/')}`
        : (req.body.coverArtUrl || null);

      let parsedScheduledAt = null;
      if (scheduledAt) {
        parsedScheduledAt = new Date(scheduledAt);
        if (Number.isNaN(parsedScheduledAt.getTime())) {
          return res.status(400).json({ error: 'scheduledAt không hợp lệ' });
        }
      }

      const album = await prisma.album.create({
        data: {
          title: title.trim(),
          type: type || null,
          coverArtUrl,
          releasedDate: null,
          scheduledAt: parsedScheduledAt,
          status: 'draft',
          artistId: req.user.id,
        },
      });

      res.status(201).json({ album });
    } catch (e) {
      console.error('createAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** PUT /api/albums/:albumId — update metadata, only if not released */
  updateAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID album không hợp lệ' });

      const existing = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (existing.status === 'released') {
        return res.status(400).json({ error: 'Không thể chỉnh sửa album đã phát hành' });
      }

      const { title, type, scheduledAt } = req.body;
      const data = {};
      if (title !== undefined) data.title = String(title).trim();
      if (type !== undefined) data.type = type;

      // Handle cover image file upload
      const coverFile = req.files?.coverImage?.[0];
      if (coverFile) {
        data.coverArtUrl = `/${path.relative(process.cwd(), coverFile.path).replace(/\\/g, '/')}`;
      } else if (req.body.coverArtUrl !== undefined) {
        data.coverArtUrl = req.body.coverArtUrl;
      }

      if (scheduledAt !== undefined) {
        if (scheduledAt === null || scheduledAt === '') {
          data.scheduledAt = null;
        } else {
          const d = new Date(scheduledAt);
          if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'scheduledAt không hợp lệ' });
          data.scheduledAt = d;
        }
      }

      const album = await prisma.album.update({
        where: { id: albumId },
        data,
      });
      res.json({ album });
    } catch (e) {
      console.error('updateAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** DELETE /api/albums/:albumId */
  deleteAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID album không hợp lệ' });

      const existing = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy album' });

      await prisma.album.delete({ where: { id: albumId } });
      res.json({ message: 'Đã xóa album' });
    } catch (e) {
      console.error('deleteAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** POST /api/albums/:albumId/songs — body: { songId, position? } */
  addSongToAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      const songId = parseInt(req.body.songId, 10);
      if (Number.isNaN(albumId) || Number.isNaN(songId)) {
        return res.status(400).json({ error: 'albumId hoặc songId không hợp lệ' });
      }

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'released') {
        return res.status(400).json({ error: 'Không thể chỉnh sửa album đã phát hành' });
      }

      // For draft/scheduled albums: allow adding songs that are pending or approved
      const song = await prisma.song.findFirst({
        where: { id: songId, uploadedById: req.user.id, isDeleted: false },
      });
      if (!song) {
        return res.status(400).json({ error: 'Bài hát không tồn tại hoặc không thuộc bạn' });
      }

      const other = await prisma.albumSong.findFirst({
        where: { songId },
      });
      if (other && other.albumId !== albumId) {
        return res.status(400).json({ error: 'Bài hát đã thuộc album khác' });
      }
      if (other && other.albumId === albumId) {
        return res.status(200).json({ message: 'Bài hát đã có trong album', albumSong: other });
      }

      let position = parseInt(req.body.position, 10);
      if (Number.isNaN(position)) {
        const agg = await prisma.albumSong.aggregate({
          where: { albumId },
          _max: { position: true },
        });
        position = (agg._max.position ?? -1) + 1;
      }

      const albumSong = await prisma.albumSong.create({
        data: { albumId, songId, position },
        include: { song: { include: songListInclude } },
      });

      res.status(201).json({ albumSong });
    } catch (e) {
      console.error('addSongToAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** DELETE /api/albums/:albumId/songs/:songId */
  removeSongFromAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      const songId = parseInt(req.params.songId, 10);
      if (Number.isNaN(albumId) || Number.isNaN(songId)) {
        return res.status(400).json({ error: 'ID không hợp lệ' });
      }

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'released') {
        return res.status(400).json({ error: 'Không thể chỉnh sửa album đã phát hành' });
      }

      await prisma.albumSong.deleteMany({
        where: { albumId, songId },
      });
      res.json({ message: 'Đã gỡ bài khỏi album' });
    } catch (e) {
      console.error('removeSongFromAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** PUT /api/albums/:albumId/reorder — body: { songIds: [3, 1, 2] } */
  reorderSongs: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'released') {
        return res.status(400).json({ error: 'Không thể chỉnh sửa album đã phát hành' });
      }

      const { songIds } = req.body;
      if (!Array.isArray(songIds) || songIds.length === 0) {
        return res.status(400).json({ error: 'songIds phải là mảng' });
      }

      // Update positions in a transaction
      await prisma.$transaction(
        songIds.map((songId, index) =>
          prisma.albumSong.updateMany({
            where: { albumId, songId: parseInt(songId, 10) },
            data: { position: index },
          })
        )
      );

      res.json({ message: 'Đã cập nhật thứ tự' });
    } catch (e) {
      console.error('reorderSongs:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** POST /api/albums/:albumId/release — immediately release */
  releaseAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
        include: { songs: { include: { song: true } } },
      });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'released') {
        return res.status(400).json({ error: 'Album đã được phát hành rồi' });
      }
      if (album.songs.length === 0) {
        return res.status(400).json({ error: 'Album phải có ít nhất 1 bài hát' });
      }

      const allSongs = album.songs.map(as => as.song).filter(Boolean);
      const unapprovedSongs = allSongs.filter(song => song.status !== 'approved' || song.isDeleted);

      if (unapprovedSongs.length > 0) {
        return res.status(400).json({
          error: `Không thể phát hành Album. Tất cả bài hát trong album phải được phê duyệt trước khi phát hành. Có ${unapprovedSongs.length} bài hát chưa được phê duyệt hoặc bị xóa.`
        });
      }

      const releasedAt = new Date();
      const notificationCount = await prisma.$transaction(async (tx) => {
        await tx.album.update({
          where: { id: albumId },
          data: {
            status: 'released',
            releasedDate: releasedAt,
            scheduledAt: null,
          },
        });

        await tx.notification.create({
          data: {
            userId: album.artistId,
            type: 'album_released',
            message: `Album "${album.title}" của bạn đã được phát hành thành công.`,
            targetType: 'ALBUM',
            targetId: albumId,
            actionUrl: `/album/${albumId}`,
          },
        });

        return notifyFollowersAboutAlbumRelease(tx, albumId);
      });
      console.log(`[Notification] Created ${notificationCount} new_album notifications for album ${albumId}`);

      res.json({ message: 'Album đã được phát hành!', approvedCount: allSongs.length, pendingCount: 0 });
    } catch (e) {
      console.error('releaseAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** POST /api/albums/:albumId/schedule — schedule release */
  scheduleAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
        include: { songs: { include: { song: true } } },
      });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'released') {
        return res.status(400).json({ error: 'Album đã được phát hành rồi' });
      }
      if (album.songs.length === 0) {
        return res.status(400).json({ error: 'Album phải có ít nhất 1 bài hát' });
      }

      const allSongs = album.songs.map(as => as.song).filter(Boolean);
      const unapprovedSongs = allSongs.filter(song => song.status !== 'approved' || song.isDeleted);

      if (unapprovedSongs.length > 0) {
        return res.status(400).json({
          error: `Không thể lên lịch phát hành Album. Tất cả bài hát trong album phải được phê duyệt trước khi lên lịch. Có ${unapprovedSongs.length} bài hát chưa được phê duyệt hoặc bị xóa.`
        });
      }

      const { scheduledAt } = req.body;
      if (!scheduledAt) {
        return res.status(400).json({ error: 'Vui lòng chọn thời gian phát hành' });
      }

      const scheduleDate = new Date(scheduledAt);
      if (Number.isNaN(scheduleDate.getTime())) {
        return res.status(400).json({ error: 'Thời gian không hợp lệ' });
      }
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ error: 'Thời gian phải ở tương lai' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.album.update({
          where: { id: albumId },
          data: {
            status: 'scheduled',
            scheduledAt: scheduleDate,
          },
        });
        await tx.notification.create({
          data: {
            userId: album.artistId,
            type: 'album_scheduled',
            message: `Album "${album.title}" đã được lên lịch phát hành.`,
            targetType: 'ALBUM',
            targetId: albumId,
            actionUrl: `/release/${albumId}`,
          },
        });
      });

      res.json({ message: 'Đã lên lịch phát hành!', scheduledAt: scheduleDate, approvedCount: allSongs.length, pendingCount: 0 });
    } catch (e) {
      console.error('scheduleAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** POST /api/albums/:albumId/unschedule — revert to draft */
  unscheduleAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
      if (album.status === 'released') {
        return res.status(400).json({ error: 'Không thể hủy album đã phát hành' });
      }

      await prisma.album.update({
        where: { id: albumId },
        data: { status: 'draft', scheduledAt: null },
      });

      res.json({ message: 'Đã hủy lịch, album quay về bản nháp' });
    } catch (e) {
      console.error('unscheduleAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** GET /api/albums/:albumId/manage — owner-only, all songs (even pending) */
  getAlbumManage: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
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
                  ...songListInclude,
                  genres: { include: { genre: true } },
                },
              },
            },
          },
        },
      });

      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });

      const tracks = album.songs.map((as) => as.song).filter(Boolean);

      res.json({
        album: {
          id: album.id,
          title: album.title,
          type: album.type,
          coverArtUrl: album.coverArtUrl,
          releasedDate: album.releasedDate,
          scheduledAt: album.scheduledAt,
          status: album.status,
          createdAt: album.createdAt,
          artistId: album.artistId,
          artist: album.artist,
        },
        tracks,
      });
    } catch (e) {
      console.error('getAlbumManage:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** GET /api/albums/:albumId — public (album của nghệ sĩ active, only released) */
  getAlbumById: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: {
          id: albumId,
          artist: { status: 'active' },
          status: 'released',
        },
        include: {
          artist: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  coverImageUrl: true,
                },
              },
            },
          },
          songs: {
            where: { song: { isDeleted: false, status: 'approved' } },
            orderBy: { position: 'asc' },
            include: {
              song: {
                include: songListInclude,
              },
            },
          },
        },
      });

      if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });

      const tracks = album.songs.map((as) => as.song).filter(Boolean);
      res.json({
        album: {
          id: album.id,
          title: album.title,
          type: album.type,
          coverArtUrl: album.coverArtUrl,
          releasedDate: album.releasedDate,
          createdAt: album.createdAt,
          artistId: album.artistId,
          artist: album.artist,
        },
        tracks,
      });
    } catch (e) {
      console.error('getAlbumById:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },
};

module.exports = albumController;
