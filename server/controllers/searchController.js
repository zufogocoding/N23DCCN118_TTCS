const prisma = require('../db/index');

const searchController = {
  searchAll: async (req, res) => {
    try {
      const query = req.query.q || '';
      if (!query.trim()) {
        return res.status(200).json({ songs: [], artists: [], playlists: [] });
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
        take: 10
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
          user: { select: { username: true } }
        },
        take: 10
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
        take: 10
      });

      res.status(200).json({ songs, artists, playlists });
    } catch (error) {
      console.error("Lỗi searchAll:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
};

module.exports = searchController;
