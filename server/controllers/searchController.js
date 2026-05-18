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
                include: { user: { select: { username: true } } }
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
            { artistName: { contains: searchTerms, mode: 'insensitive' } },
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

      // Tính toán hasNextPage
      const hasNextSongs = songs.length > limit;
      const hasNextArtists = artists.length > limit;
      const hasNextPlaylists = playlists.length > limit;
      
      const hasNextPage = hasNextSongs || hasNextArtists || hasNextPlaylists;

      // Cắt bỏ phần tử dư thừa
      if (hasNextSongs) songs.pop();
      if (hasNextArtists) artists.pop();
      if (hasNextPlaylists) playlists.pop();

      res.status(200).json({ 
        songs, 
        artists, 
        playlists,
        page,
        hasNextPage 
      });
    } catch (error) {
      console.error("Lỗi searchAll:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
};

module.exports = searchController;
