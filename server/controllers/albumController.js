const prisma = require('../db/index');

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
            orderBy: { releasedDate: 'desc' },
            include: {
              songs: {
                orderBy: { position: 'asc' },
                include: {
                  song: {
                    where: { isDeleted: false, status: 'approved' },
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
        tracks: al.songs.map((as) => as.song).filter(Boolean),
      }));

      res.json({ albums });
    } catch (e) {
      console.error('listAlbumsByArtist:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** POST /api/albums */
  createAlbum: async (req, res) => {
    try {
      const { title, type, coverArtUrl, releasedDate } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Thiếu tiêu đề album' });
      }

      const released = releasedDate ? new Date(releasedDate) : null;
      if (releasedDate && Number.isNaN(released.getTime())) {
        return res.status(400).json({ error: 'releasedDate không hợp lệ' });
      }

      const album = await prisma.album.create({
        data: {
          title: title.trim(),
          type: type || null,
          coverArtUrl: coverArtUrl || null,
          releasedDate: released,
          artistId: req.user.id,
        },
      });

      res.status(201).json({ album });
    } catch (e) {
      console.error('createAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** PUT /api/albums/:albumId */
  updateAlbum: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID album không hợp lệ' });

      const existing = await prisma.album.findFirst({
        where: { id: albumId, artistId: req.user.id },
      });
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy album' });

      const { title, type, coverArtUrl, releasedDate } = req.body;
      const data = {};
      if (title !== undefined) data.title = String(title).trim();
      if (type !== undefined) data.type = type;
      if (coverArtUrl !== undefined) data.coverArtUrl = coverArtUrl;
      if (releasedDate !== undefined) {
        if (releasedDate === null || releasedDate === '') data.releasedDate = null;
        else {
          const d = new Date(releasedDate);
          if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'releasedDate không hợp lệ' });
          data.releasedDate = d;
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

      const song = await prisma.song.findFirst({
        where: { id: songId, uploadedById: req.user.id, isDeleted: false, status: 'approved' },
      });
      if (!song) {
        return res.status(400).json({ error: 'Bài hát không tồn tại, chưa duyệt, hoặc không thuộc bạn' });
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

      await prisma.albumSong.deleteMany({
        where: { albumId, songId },
      });
      res.json({ message: 'Đã gỡ bài khỏi album' });
    } catch (e) {
      console.error('removeSongFromAlbum:', e);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  /** GET /api/albums/:albumId — public (album của nghệ sĩ active) */
  getAlbumById: async (req, res) => {
    try {
      const albumId = parseInt(req.params.albumId, 10);
      if (Number.isNaN(albumId)) return res.status(400).json({ error: 'ID không hợp lệ' });

      const album = await prisma.album.findFirst({
        where: {
          id: albumId,
          artist: { status: 'active' },
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
            orderBy: { position: 'asc' },
            include: {
              song: {
                where: { isDeleted: false, status: 'approved' },
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
