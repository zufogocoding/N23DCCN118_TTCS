const prisma = require('../db/index');
const path = require('path');

const songController = {
  // 1. Logic Upload (nhận audio + cover image)
  uploadSong: async (req, res) => {
    try {
      // req.files chứa { audioFile: [...], coverImage: [...] }
      const audioFile = req.files?.audioFile?.[0];
      if (!audioFile) return res.status(400).json({ error: 'Chưa chọn file nhạc!' });

      const savedAudioUrl = `/${path.relative(process.cwd(), audioFile.path).replace(/\\/g, '/')}`;
      const { title, durationMs, artistName, genre, genreIds, tempo: clientTempo, energy: clientEnergy, danceability: clientDanceability } = req.body;
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
      let savedCoverUrl = coverFile ? `/${path.relative(process.cwd(), coverFile.path).replace(/\\/g, '/')}` : null;

      const albumIdRaw = req.body.albumId;
      const albumIdParsed = albumIdRaw != null && albumIdRaw !== '' ? parseInt(albumIdRaw, 10) : NaN;
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

        if (!savedCoverUrl && metadata.common.picture && metadata.common.picture.length > 0) {
          const fs = require('fs');
          const path = require('path');
          const crypto = require('crypto');
          const picture = metadata.common.picture[0];
          const extension = picture.format === 'image/png' ? 'png' : 'jpg';
          const fileName = `cover_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
          const coverPath = path.join('uploads', 'covers', fileName);
          if (!fs.existsSync(path.join('uploads', 'covers'))) {
            fs.mkdirSync(path.join('uploads', 'covers'), { recursive: true });
          }
          fs.writeFileSync(coverPath, picture.data);
          savedCoverUrl = `/${coverPath.replace(/\\/g, '/')}`;
        }
      } catch (err) {
        console.error("Không thể đọc metadata file:", err);
      }

      // Kiểm tra user đã có Artist record chưa (chỉ tìm, KHÔNG tự tạo)
      const existingArtist = await prisma.artist.findUnique({ where: { userId } });
      const isOriginal = req.body.isOriginal === 'true' || req.body.isOriginal === true;

      // Mặc định các thông số thuộc tính âm thanh theo Genre (BPM, Energy, Danceability)
      let tempo = clientTempo ? parseFloat(clientTempo) : NaN;
      let energy = clientEnergy ? parseFloat(clientEnergy) : NaN;
      let danceability = clientDanceability ? parseFloat(clientDanceability) : NaN;

      const isCustomBpm = !isNaN(tempo);

      let defaultTempo = 100;
      let defaultEnergy = 0.5;
      let defaultDanceability = 0.5;
      let selectedGenreTag = "";

      if (parsedGenreIds.length > 0) {
        try {
          const selectedGenre = await prisma.genre.findUnique({
            where: { id: parsedGenreIds[0] }
          });
          if (selectedGenre) {
            selectedGenreTag = selectedGenre.genreTag;
            const tag = selectedGenre.genreTag.toLowerCase();
            if (tag.includes('lo-fi') || tag.includes('lofi')) {
              defaultTempo = 75; defaultEnergy = 0.3; defaultDanceability = 0.4;
            } else if (tag.includes('edm') || tag.includes('dance') || tag.includes('electronic') || tag.includes('techno') || tag.includes('house') || tag.includes('dubstep')) {
              defaultTempo = 128; defaultEnergy = 0.85; defaultDanceability = 0.9;
            } else if (tag.includes('pop') || tag.includes('indie-pop')) {
              defaultTempo = 110; defaultEnergy = 0.65; defaultDanceability = 0.7;
            } else if (tag.includes('rock') || tag.includes('metal') || tag.includes('punk') || tag.includes('grunge')) {
              defaultTempo = 125; defaultEnergy = 0.85; defaultDanceability = 0.5;
            } else if (tag.includes('ballad') || tag.includes('r&b') || tag.includes('soul') || tag.includes('jazz') || tag.includes('blues')) {
              defaultTempo = 85; defaultEnergy = 0.4; defaultDanceability = 0.5;
            } else if (tag.includes('hip-hop') || tag.includes('hiphop') || tag.includes('rap') || tag.includes('trap')) {
              defaultTempo = 90; defaultEnergy = 0.7; defaultDanceability = 0.8;
            } else if (tag.includes('acoustic') || tag.includes('folk') || tag.includes('indie') || tag.includes('country')) {
              defaultTempo = 95; defaultEnergy = 0.4; defaultDanceability = 0.5;
            } else if (tag.includes('classical') || tag.includes('instrumental') || tag.includes('orchestral') || tag.includes('soundtrack')) {
              defaultTempo = 80; defaultEnergy = 0.2; defaultDanceability = 0.2;
            } else if (tag.includes('ambient') || tag.includes('chill') || tag.includes('relax') || tag.includes('meditation')) {
              defaultTempo = 65; defaultEnergy = 0.15; defaultDanceability = 0.25;
            } else if (tag.includes('reggae') || tag.includes('ska') || tag.includes('dub')) {
              defaultTempo = 80; defaultEnergy = 0.5; defaultDanceability = 0.75;
            } else if (tag.includes('latin') || tag.includes('reggaeton') || tag.includes('salsa') || tag.includes('bachata')) {
              defaultTempo = 100; defaultEnergy = 0.75; defaultDanceability = 0.85;
            }
          }
        } catch (e) {
          console.error("Lỗi tự động gán thuộc tính âm thanh:", e);
        }
      }

      if (isNaN(tempo)) tempo = defaultTempo;
      if (isNaN(energy)) energy = defaultEnergy;
      if (isNaN(danceability)) danceability = defaultDanceability;

      const songData = {
        title: finalTitle,
        artistName: finalArtistName, // Lưu tên nghệ sĩ trực tiếp trên Song (metadata)
        uploadedById: userId,           // Lưu ai đã upload
        durationMs: finalDurationMs,
        audioUrl: savedAudioUrl,
        coverArtUrl: savedCoverUrl,
        tempo: parseFloat(tempo),
        energy: parseFloat(energy),
        danceability: parseFloat(danceability),
        status: 'pending', // Mặc định pending, chờ admin duyệt
        // Liên kết genres nếu có genreIds
        ...(parsedGenreIds.length > 0 && {
          genres: {
            create: parsedGenreIds.map(gId => ({ genreId: gId })),
          },
        }),
      };



      // Chỉ liên kết ArtistSong nếu user ĐÃ là nghệ sĩ (đã được duyệt qua ArtistRequest) và tick OG
      if (existingArtist && isOriginal) {
        songData.artists = {
          create: {
            artistId: userId
          }
        };
      }

      const newSong = await prisma.song.create({ data: songData });

      if (!Number.isNaN(albumIdParsed)) {
        const album = await prisma.album.findFirst({
          where: { id: albumIdParsed, artistId: userId },
        });
        if (album) {
          const clash = await prisma.albumSong.findFirst({ where: { songId: newSong.id } });
          if (!clash) {
            const agg = await prisma.albumSong.aggregate({
              where: { albumId: album.id },
              _max: { position: true },
            });
            const position = (agg._max.position ?? -1) + 1;
            await prisma.albumSong.create({
              data: { albumId: album.id, songId: newSong.id, position },
            });
          }
        }
      }

      // Gọi sang ml-service để phân tích DSP hoặc đồng bộ vector
      try {
        const mlApiUrl = process.env.ML_API_URL || 'http://ml-api:8000';
        const analyzeUrl = `${mlApiUrl}/songs/${newSong.id}/analyze?file_path=${encodeURIComponent(audioFile.path)}&genre_tag=${encodeURIComponent(selectedGenreTag)}`;
        console.log(`Đang gọi ml-service phân tích bài hát ${newSong.id}: ${analyzeUrl}`);
        
        const mlResponse = await fetch(analyzeUrl, { method: 'POST' });
        if (mlResponse.ok) {
          const mlData = await mlResponse.json();
          console.log("Kết quả phân tích âm phổ thành công từ AI:", mlData);
          
          // Cập nhật lại các giá trị đã được phân tích thực tế vào đối tượng bài hát phản hồi
          newSong.tempo = mlData.features.tempo;
          newSong.energy = mlData.features.energy;
          newSong.danceability = mlData.features.danceability;
        } else {
          console.error("ml-service báo lỗi khi phân tích bài hát:", await mlResponse.text());
        }
      } catch (mlErr) {
        console.error("Không thể kết nối đến ml-service để phân tích bài hát:", mlErr);
      }

      res.status(201).json({ message: 'Upload thành công! Bài hát đang chờ admin duyệt.', song: newSong });
    } catch (error) {
      console.error("Lỗi uploadSong:", error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  getAllSongs: async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : null;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit) || 50, 100) : 50;

      if (page !== null) {
        const skip = (page - 1) * limit;
        const [songs, total] = await Promise.all([
          prisma.song.findMany({
            where: { isDeleted: false, status: 'approved' },
            include: {
              artists: {
                include: {
                  artist: {
                    include: { user: { select: { username: true, displayName: true } } }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
          }),
          prisma.song.count({ where: { isDeleted: false, status: 'approved' } })
        ]);

        return res.status(200).json({
          songs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } else {
        const songs = await prisma.song.findMany({
          where: { isDeleted: false, status: 'approved' },
          include: {
            artists: {
              include: {
                artist: {
                  include: { user: { select: { username: true, displayName: true } } }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        });
        return res.status(200).json(songs);
      }
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
                include: { user: { select: { username: true, displayName: true } } }
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

  // 4. Logic Chỉnh sửa bài hát (title, artistName, genreIds, coverImage)
  updateSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const userId = req.user.id;

      // Kiểm tra bài hát tồn tại, chưa bị xóa, và thuộc về user
      const existing = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false, uploadedById: userId }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát hoặc bạn không có quyền chỉnh sửa!' });
      }

      const { title, newTitle, artistName, genreIds } = req.body;
      const data = {};

      // Support both 'title' and 'newTitle' for backward compatibility
      const finalTitle = title || newTitle;
      if (finalTitle !== undefined) data.title = String(finalTitle).trim();
      if (artistName !== undefined) data.artistName = artistName || null;

      // Handle cover image upload
      const coverFile = req.files?.coverImage?.[0];
      if (coverFile) {
        data.coverArtUrl = `/${coverFile.path.replace(/\\/g, '/')}`;
      }

      const updatedSong = await prisma.song.update({
        where: { id: songId },
        data
      });

      // Handle genre updates if provided
      if (genreIds !== undefined) {
        let parsedGenreIds = [];
        try {
          let parsed = typeof genreIds === 'string' ? JSON.parse(genreIds) : genreIds;
          if (!Array.isArray(parsed)) parsed = [parsed];
          parsedGenreIds = parsed.map(id => parseInt(id)).filter(id => !isNaN(id));
        } catch {
          // ignore
        }

        // Delete existing genre associations and recreate
        await prisma.songGenre.deleteMany({ where: { songId } });
        if (parsedGenreIds.length > 0) {
          await prisma.songGenre.createMany({
            data: parsedGenreIds.map(genreId => ({ songId, genreId })),
          });
        }
      }

      // Fetch updated song with relations
      const fullSong = await prisma.song.findUnique({
        where: { id: songId },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          },
          genres: { include: { genre: true } }
        }
      });

      res.status(200).json({ message: 'Cập nhật thành công!', song: fullSong });
    } catch (error) {
      console.error("Lỗi updateSong:", error);
      res.status(500).json({ error: 'Không thể sửa bài hát' });
    }
  },

  // 5. Logic Xóa mềm (Soft Delete) - chỉ đánh dấu isDeleted = true thay vì xóa vĩnh viễn
  deleteSong: async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const userId = req.user.id;

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const existing = await prisma.song.findFirst({
        where: { id: songId, isDeleted: false }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát này!' });
      }

      // Check admin or artist owner
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isOwner = existing.uploadedById === userId;
      const isAdmin = user?.isAdmin || false;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa bài hát này' });
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

  // 6b. Bài đã upload của user đang đăng nhập (mọi trạng thái, chưa xóa mềm)
  getMyUploaded: async (req, res) => {
    try {
      const userId = req.user.id;
      const songs = await prisma.song.findMany({
        where: { uploadedById: userId, isDeleted: false },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          },
          albums: {
            include: { album: { select: { id: true, title: true, coverArtUrl: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(songs);
    } catch (error) {
      console.error('Lỗi getMyUploaded:', error);
      res.status(500).json({ error: 'Không lấy được danh sách bài đã upload' });
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
                include: { user: { select: { username: true, displayName: true } } }
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
