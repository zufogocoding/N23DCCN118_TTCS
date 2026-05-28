const prisma = require('../db/index');
const path = require('path');

const songListInclude = {
  artists: {
    include: {
      artist: {
        include: { user: { select: { username: true, displayName: true } } },
      },
    },
  },
};

const artistController = {
  // GET /api/artists/:id — optionalAuth: req.user có thể null
  getArtistProfile: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'ID không hợp lệ' });
      }

      const artistRow = await prisma.artist.findFirst({
        where: { userId: id, status: 'active' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              coverImageUrl: true,
              bio: true,
              socialLinks: true,
              role: true,
            },
          },
          albums: {
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
          pinnedSong: {
            include: songListInclude,
          },
        },
      });

      if (!artistRow) {
        return res.status(404).json({ error: 'Không tìm thấy nghệ sĩ' });
      }

      const viewerId = req.user?.id;
      let isFollowing = false;
      if (viewerId && viewerId !== id) {
        const f = await prisma.follow.findUnique({
          where: {
            followerId_followeeId: { followerId: viewerId, followeeId: id },
          },
        });
        isFollowing = !!f;
      }

      const discographyWhere = {
        isDeleted: false,
        status: 'approved',
        OR: [{ uploadedById: id }, { artists: { some: { artistId: id } } }],
      };

      const page = Math.max(1, parseInt(req.query.songsPage, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.songsLimit, 10) || 20));
      const skip = (page - 1) * limit;

      const [topSongs, discographySongs, discographyTotal] = await Promise.all([
        prisma.song.findMany({
          where: discographyWhere,
          orderBy: { playCount: 'desc' },
          take: 5,
          include: songListInclude,
        }),
        prisma.song.findMany({
          where: discographyWhere,
          orderBy: [{ playCount: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
          include: songListInclude,
        }),
        prisma.song.count({ where: discographyWhere }),
      ]);

      const { user, albums: albumsRaw, ...artistOnly } = artistRow;

      const albums = albumsRaw.map((al) => ({
        id: al.id,
        title: al.title,
        type: al.type,
        coverArtUrl: al.coverArtUrl,
        releasedDate: al.releasedDate,
        createdAt: al.createdAt,
        tracks: al.songs.map((as) => as.song).filter(Boolean),
      }));

      const profile = {
        ...user,
        artist: {
          userId: artistOnly.userId,
          artistBio: artistOnly.artistBio,
          avatarUrl: artistOnly.avatarUrl,
          bannerUrl: artistOnly.bannerUrl,
          verifiedTick: artistOnly.verifiedTick,
          status: artistOnly.status,
          pinnedSongId: artistOnly.pinnedSongId,
        },
        followerCount: artistOnly.followerCount,
        pinnedSong: artistOnly.pinnedSong,
        isFollowing,
      };

      res.status(200).json({
        profile,
        topSongs,
        albums,
        discography: {
          songs: discographySongs,
          total: discographyTotal,
          page,
          limit,
        },
      });
    } catch (error) {
      console.error('Lỗi getArtistProfile:', error);
      res.status(500).json({ error: 'Lỗi server khi lấy thông tin nghệ sĩ' });
    }
  },

  followArtist: async (req, res) => {
    try {
      const followeeId = parseInt(req.params.id, 10);
      const followerId = req.user.id;

      if (Number.isNaN(followeeId)) {
        return res.status(400).json({ error: 'ID không hợp lệ' });
      }
      if (followerId === followeeId) {
        return res.status(400).json({ error: 'Không thể theo dõi chính mình' });
      }

      const target = await prisma.artist.findFirst({
        where: { userId: followeeId, status: 'active' },
      });
      if (!target) {
        return res.status(404).json({ error: 'Không tìm thấy nghệ sĩ' });
      }

      const existing = await prisma.follow.findUnique({
        where: {
          followerId_followeeId: { followerId, followeeId },
        },
      });
      if (existing) {
        return res.status(200).json({ message: 'Đã theo dõi nghệ sĩ này', following: true });
      }

      await prisma.$transaction([
        prisma.follow.create({
          data: { followerId, followeeId },
        }),
        prisma.artist.update({
          where: { userId: followeeId },
          data: { followerCount: { increment: 1 } },
        }),
      ]);

      res.status(201).json({ message: 'Đã theo dõi', following: true });
    } catch (error) {
      console.error('Lỗi followArtist:', error);
      res.status(500).json({ error: 'Lỗi server khi theo dõi' });
    }
  },

  unfollowArtist: async (req, res) => {
    try {
      const followeeId = parseInt(req.params.id, 10);
      const followerId = req.user.id;

      if (Number.isNaN(followeeId)) {
        return res.status(400).json({ error: 'ID không hợp lệ' });
      }

      const target = await prisma.artist.findFirst({
        where: { userId: followeeId, status: 'active' },
      });
      if (!target) {
        return res.status(404).json({ error: 'Không tìm thấy nghệ sĩ' });
      }

      const existing = await prisma.follow.findUnique({
        where: {
          followerId_followeeId: { followerId, followeeId },
        },
      });
      if (!existing) {
        return res.status(200).json({ message: 'Chưa theo dõi', following: false });
      }

      await prisma.$transaction(async (tx) => {
        await tx.follow.delete({
          where: {
            followerId_followeeId: { followerId, followeeId },
          },
        });
        const a = await tx.artist.findUnique({ where: { userId: followeeId } });
        // BUG FIX: followerCount có thể là 0, không fallback về 1
        const next = Math.max(0, (a?.followerCount ?? 0) - 1);
        await tx.artist.update({
          where: { userId: followeeId },
          data: { followerCount: next },
        });
      });

      res.status(200).json({ message: 'Đã bỏ theo dõi', following: false });
    } catch (error) {
      console.error('Lỗi unfollowArtist:', error);
      res.status(500).json({ error: 'Lỗi server khi bỏ theo dõi' });
    }
  },

  // PUT /api/artists/:id/profile — authMiddleware + multer (avatarFile, bannerFile)
  updateArtistProfile: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Chỉ được sửa hồ sơ của chính bạn' });
      }

      const { bio, artistBio, socialLinks } = req.body;

      // Parse socialLinks (arrives as JSON string from FormData)
      let parsedSocialLinks = undefined;
      if (socialLinks !== undefined) {
        try {
          const parsed = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
          if (!Array.isArray(parsed)) {
            return res.status(400).json({ error: 'socialLinks phải là một mảng' });
          }
          if (parsed.length > 5) {
            return res.status(400).json({ error: 'Tối đa chỉ được 5 social links' });
          }
          parsedSocialLinks = parsed;
        } catch {
          return res.status(400).json({ error: 'socialLinks không hợp lệ' });
        }
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'Không tìm thấy user/nghệ sĩ' });
      }

      // Handle file uploads
      const avatarFile = req.files?.avatarFile?.[0];
      const bannerFile = req.files?.bannerFile?.[0];

      const updateData = {};
      if (bio !== undefined) updateData.bio = bio;
      if (parsedSocialLinks !== undefined) updateData.socialLinks = parsedSocialLinks;

      // Avatar: prefer uploaded file, fallback to text URL from body
      if (avatarFile) {
        updateData.avatarUrl = `/${path.relative(process.cwd(), avatarFile.path).replace(/\\/g, '/')}`;
      } else if (req.body.avatarUrl !== undefined) {
        updateData.avatarUrl = req.body.avatarUrl;
      }

      // CoverImage: prefer uploaded file (same as banner for user model)
      if (bannerFile) {
        updateData.coverImageUrl = `/${path.relative(process.cwd(), bannerFile.path).replace(/\\/g, '/')}`;
      } else if (req.body.coverImageUrl !== undefined) {
        updateData.coverImageUrl = req.body.coverImageUrl;
      }

      const artistUpdate = {};
      if (artistBio !== undefined) artistUpdate.artistBio = artistBio;

      // Banner for artist model
      if (bannerFile) {
        artistUpdate.bannerUrl = `/${path.relative(process.cwd(), bannerFile.path).replace(/\\/g, '/')}`;
      } else if (req.body.bannerUrl !== undefined) {
        artistUpdate.bannerUrl = req.body.bannerUrl;
      }

      // Also set artist avatar if file uploaded
      if (avatarFile) {
        artistUpdate.avatarUrl = `/${path.relative(process.cwd(), avatarFile.path).replace(/\\/g, '/')}`;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          coverImageUrl: true,
          bio: true,
          socialLinks: true,
        },
      });

      if (Object.keys(artistUpdate).length > 0) {
        await prisma.artist.updateMany({
          where: { userId: id },
          data: artistUpdate,
        });
      }

      res.status(200).json({
        message: 'Cập nhật profile thành công',
        profile: updatedUser,
      });
    } catch (error) {
      console.error('Lỗi updateArtistProfile:', error);
      res.status(500).json({ error: 'Lỗi server khi cập nhật profile' });
    }
  },

  pinSong: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Chỉ được thay đổi của chính bạn' });
      }

      const { songId } = req.body;
      const artist = await prisma.artist.findUnique({ where: { userId: id } });
      if (!artist) {
        return res.status(404).json({ error: 'Không tìm thấy nghệ sĩ' });
      }

      await prisma.artist.update({
        where: { userId: id },
        data: { pinnedSongId: songId || null },
      });

      res.status(200).json({ message: 'Đã cập nhật bài hát ghim' });
    } catch (error) {
      console.error('Lỗi pinSong:', error);
      res.status(500).json({ error: 'Lỗi server khi ghim bài hát' });
    }
  },

  getAnalytics: async (req, res) => {
    try {
      const artistId = req.user.id;

      // Tìm tất cả bài hát thuộc về nghệ sĩ này
      const artistSongs = await prisma.song.findMany({
        where: {
          OR: [
            { uploadedById: artistId },
            { artists: { some: { artistId } } }
          ],
          isDeleted: false
        },
        select: { id: true }
      });

      const songIds = artistSongs.map(s => s.id);

      if (songIds.length === 0) {
        return res.status(200).json({
          playTrend: [],
          averageCompletionRate: 0,
          skipRate: 0,
          topSongs: [],
          totalSongs: 0,
          totalPlays: 0
        });
      }

      // 1. Lượt nghe theo thời gian (30 ngày qua)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const interactions = await prisma.interaction.findMany({
        where: {
          songId: { in: songIds },
          timeStamp: { gte: thirtyDaysAgo }
        },
        select: {
          timeStamp: true
        }
      });

      const playsByDate = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        playsByDate[dateStr] = 0;
      }

      interactions.forEach(inter => {
        const dateStr = inter.timeStamp.toISOString().split('T')[0];
        if (playsByDate[dateStr] !== undefined) {
          playsByDate[dateStr] += 1;
        }
      });

      const playTrend = Object.keys(playsByDate).map(date => ({
        date,
        count: playsByDate[date]
      }));

      // 2. Average Completion Rate (chỉ tính lượt không skip và có completionRate)
      const completionRateAggregate = await prisma.interaction.aggregate({
        where: {
          songId: { in: songIds },
          isSkipped: false,
          completionRate: { not: null }
        },
        _avg: {
          completionRate: true
        }
      });
      const averageCompletionRate = completionRateAggregate._avg.completionRate || 0;

      // 3. Skip Rate
      const totalPlayCount = await prisma.interaction.count({
        where: { songId: { in: songIds } }
      });
      const skipPlayCount = await prisma.interaction.count({
        where: { songId: { in: songIds }, isSkipped: true }
      });
      const skipRate = totalPlayCount > 0 ? (skipPlayCount / totalPlayCount) : 0;

      // 4. Top 5 bài hát thịnh hành của nghệ sĩ
      const topSongs = await prisma.song.findMany({
        where: {
          id: { in: songIds },
          status: 'approved',
          isDeleted: false
        },
        orderBy: {
          playCount: 'desc'
        },
        take: 5,
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          playCount: true
        }
      });

      const topSongsData = await Promise.all(topSongs.map(async (song) => {
        const songPlays = await prisma.interaction.count({ where: { songId: song.id } });
        const songSkips = await prisma.interaction.count({ where: { songId: song.id, isSkipped: true } });
        const songAvgCompletion = await prisma.interaction.aggregate({
          where: { songId: song.id, isSkipped: false, completionRate: { not: null } },
          _avg: { completionRate: true }
        });

        return {
          id: song.id,
          title: song.title,
          coverArtUrl: song.coverArtUrl,
          playCount: song.playCount,
          skipRate: songPlays > 0 ? (songSkips / songPlays) : 0,
          averageCompletionRate: songAvgCompletion._avg.completionRate || 0
        };
      }));

      res.status(200).json({
        playTrend,
        averageCompletionRate,
        skipRate,
        topSongs: topSongsData,
        totalSongs: songIds.length,
        totalPlays: totalPlayCount
      });
    } catch (error) {
      console.error('Lỗi getAnalytics:', error);
      res.status(500).json({ error: 'Lỗi server khi lấy thống kê phân tích' });
    }
  },
};

module.exports = artistController;
