const prisma = require('../db/index');

const songController = {
  // 1. Logic Upload (nhận audio + cover image)
  uploadSong: async (req, res) => {
    try {
      // req.files chứa { audioFile: [...], coverImage: [...] }
      const audioFile = req.files?.audioFile?.[0];
      if (!audioFile) return res.status(400).json({ error: 'Chưa chọn file nhạc!' });

      const savedAudioUrl = `/${audioFile.path.replace(/\\/g, '/')}`;
      const { title, durationMs, artistName, genre, genreIds } = req.body;
      const userId = req.user.id;

      // Parse genreIds và genre: hỗ trợ cả JSON string và mảng
      let parsedGenreIds = [];
      if (genreIds) {
        try {
          let parsed = typeof genreIds === 'string' ? JSON.parse(genreIds) : genreIds;
          if (!Array.isArray(parsed)) parsed = [parsed];
          parsedGenreIds = parsed.map(id => parseInt(id)).filter(id => !isNaN(id));
        } catch {
          // ignore
        }
      }
      if (genre) {
        try {
          let parsed = typeof genre === 'string' ? JSON.parse(genre) : genre;
          if (!Array.isArray(parsed)) parsed = [parsed];
          const gIds = parsed.map(id => parseInt(id)).filter(id => !isNaN(id));
          parsedGenreIds = [...parsedGenreIds, ...gIds];
        } catch {
          const gIds = String(genre).split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));
          parsedGenreIds = [...parsedGenreIds, ...gIds];
        }
      }
      // Loại bỏ trùng lặp
      parsedGenreIds = [...new Set(parsedGenreIds)];

      // Cover image (optional)
      const coverFile = req.files?.coverImage?.[0];
      const savedCoverUrl = coverFile ? `/${coverFile.path.replace(/\\/g, '/')}` : null;

      let finalTitle = title || 'Bài hát chưa đặt tên';
      let finalDurationMs = parseInt(durationMs) || 0;
      let finalArtistName = artistName || null;

      try {
        const mm = await import('music-metadata');
        const metadata = await mm.parseFile(audioFile.path);
        
        if (!durationMs && metadata.format.duration) {
          finalDurationMs = Math.floor(metadata.format.duration * 1000);
        }
        if (!title && metadata.common.title) {
          finalTitle = metadata.common.title;
        }
        if (!artistName && metadata.common.artist) {
          finalArtistName = metadata.common.artist;
        }
      } catch (err) {
        console.error("Không thể đọc metadata file:", err);
      }



      // Kiểm tra user đã có Artist record chưa (chỉ tìm, KHÔNG tự tạo)
      const existingArtist = await prisma.artist.findUnique({ where: { userId } });

      const songData = {
        title: finalTitle,
        artistName: finalArtistName, // Lưu tên nghệ sĩ trực tiếp trên Song (metadata)
        uploadedById: userId,           // Lưu ai đã upload
        durationMs: finalDurationMs,
        audioUrl: savedAudioUrl,
        coverArtUrl: savedCoverUrl,
        status: 'pending', // Mặc định pending, chờ admin duyệt
        // Liên kết genres nếu có genreIds
        ...(parsedGenreIds.length > 0 && {
          genres: {
            create: parsedGenreIds.map(gId => ({ genreId: gId })),
          },
        }),
      };



      // Chỉ liên kết ArtistSong nếu user ĐÃ là nghệ sĩ (đã được duyệt qua ArtistRequest)
      if (existingArtist) {
        songData.artists = {
          create: {
            artistId: userId
          }
        };
      }

      const newSong = await prisma.song.create({ data: songData });
      res.status(201).json({ message: 'Upload thành công! Bài hát đang chờ admin duyệt.', song: newSong });
    } catch (error) {
      console.error("Lỗi uploadSong:", error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  // 2. Logic Lấy tất cả bài hát (chỉ lấy bài đã duyệt và chưa bị xóa mềm)
  getAllSongs: async (req, res) => {
    try {
      const allSongs = await prisma.song.findMany({
        where: { isDeleted: false, status: 'approved' },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true } } }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(allSongs);
    } catch (error) {
      console.error("Lỗi getAllSongs:", error);
      res.status(500).json({ error: 'Không lấy được danh sách bài hát' });
    }
  },

  // 3. Logic Lấy 1 bài hát theo ID (chỉ lấy bài chưa bị xóa mềm)
  getSongById: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const song = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true } } }
              }
            }
          },
          genres: {
            include: { genre: true }
          }
        }
      });
      if (!song) return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      res.status(200).json(song);
    } catch (error) {
      console.error("Lỗi getSongById:", error);
      res.status(500).json({ error: 'Lỗi khi tìm bài hát' });
    }
  },

  // 4. Logic Đổi tên
  updateSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const { newTitle } = req.body;

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const existing = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      }

      const updatedSong = await prisma.song.update({
        where: { id: songId },
        data: { title: newTitle }
      });
      res.status(200).json({ message: 'Đổi tên thành công!', song: updatedSong });
    } catch (error) {
      console.error("Lỗi updateSong:", error);
      res.status(500).json({ error: 'Không thể sửa bài hát' });
    }
  },

  // 5. Logic Xóa mềm (Soft Delete) - chỉ đánh dấu isDeleted = true thay vì xóa vĩnh viễn
  deleteSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const existing = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      }

      await prisma.song.update({
        where: { id: songId },
        data: { isDeleted: true }
      });
      res.status(200).json({ message: 'Đã xóa bài hát khỏi hệ thống!' });
    } catch (error) {
      console.error("Lỗi deleteSong:", error);
      res.status(500).json({ error: 'Không thể xóa' });
    }
  },

  // 6. Logic Lấy bài hát theo userId
  getUserSongs: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userSongs = await prisma.song.findMany({
        where: { uploadedById: userId, isDeleted: false },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true } } }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(userSongs);
    } catch (error) {
      console.error("Lỗi getUserSongs:", error);
      res.status(500).json({ error: 'Không lấy được danh sách bài hát của người dùng' });
    }
  }
};

module.exports = songController;
