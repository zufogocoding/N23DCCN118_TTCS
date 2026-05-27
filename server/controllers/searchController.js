const prisma = require('../db/index');

const searchController = {
  searchAll: async (req, res) => {
    try {
      const query = req.query.q || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      if (!query.trim()) {
        return res.status(200).json({ songs: [], artists: [], playlists: [], hasNextPage: false });
      }

      const searchTerms = query.trim();

      // Search Songs
      const songs = await prisma.song.findMany({
        where: {
          isDeleted: false,
          status: 'approved',
          OR: [
            { title: { contains: searchTerms, mode: 'insensitive' } },
            { artistName: { contains: searchTerms, mode: 'insensitive' } }
          ]
        },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          }
        },
        skip,
        take: limit + 1 // Lấy dư 1 để check hasNextPage
      });

      // Search Artists
      const artists = await prisma.artist.findMany({
        where: {
          status: 'active',
          OR: [
            { user: { displayName: { contains: searchTerms, mode: 'insensitive' } } },
            { user: { username: { contains: searchTerms, mode: 'insensitive' } } }
          ]
        },
        include: {
          user: { select: { username: true, displayName: true } }
        },
        skip,
        take: limit + 1
      });

      // Search Playlists
      const playlists = await prisma.playlist.findMany({
        where: {
          isPublic: true,
          OR: [
            { title: { contains: searchTerms, mode: 'insensitive' } }
          ]
        },
        include: {
          user: { select: { username: true } }
        },
        skip,
        take: limit + 1
      });

      // Search Albums
      const albums = await prisma.album.findMany({
        where: {
          status: 'released',
          OR: [
            { title: { contains: searchTerms, mode: 'insensitive' } }
          ]
        },
        include: {
          artist: {
            include: {
              user: { select: { username: true, displayName: true } }
            }
          }
        },
        skip,
        take: limit + 1
      });

      // Tính toán hasNextPage
      const hasNextSongs = songs.length > limit;
      const hasNextArtists = artists.length > limit;
      const hasNextPlaylists = playlists.length > limit;
      const hasNextAlbums = albums.length > limit;
      
      const hasNextPage = hasNextSongs || hasNextArtists || hasNextPlaylists || hasNextAlbums;

      // Cắt bỏ phần tử dư thừa
      if (hasNextSongs) songs.pop();
      if (hasNextArtists) artists.pop();
      if (hasNextPlaylists) playlists.pop();
      if (hasNextAlbums) albums.pop();

      res.status(200).json({ 
        songs, 
        artists, 
        playlists,
        albums,
        page,
        hasNextPage 
      });
    } catch (error) {
      console.error("Lỗi searchAll:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  browseByGenre: async (req, res) => {
    try {
      const genreId = parseInt(req.params.genreId);
      if (isNaN(genreId)) return res.status(400).json({ error: 'genreId không hợp lệ' });

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const songs = await prisma.song.findMany({
        where: {
          isDeleted: false,
          status: 'approved',
          genres: { some: { genreId } }
        },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          }
        },
        orderBy: { playCount: 'desc' },
        skip,
        take: limit + 1
      });

      const hasNextPage = songs.length > limit;
      if (hasNextPage) songs.pop();

      res.status(200).json({ songs, page, hasNextPage });
    } catch (error) {
      console.error('Lỗi browseByGenre:', error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  }
};

module.exports = searchController;
