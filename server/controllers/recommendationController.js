// server/controllers/recommendationController.js
const prisma = require('../db/index');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

const recommendationController = {
  /**
   * GET /api/recommendations
   * Lấy danh sách bài hát gợi ý cá nhân hóa cho User hiện tại.
   * Sử dụng cơ chế: cache -> pgvector hybrid raw SQL -> trending fallback.
   */
  getRecommendations: async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      const limit = parseInt(req.query.limit) || 15;

      // 1. Kiểm tra cache trong RecommendationCache (hạn dùng 24 tiếng)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const cached = await prisma.recommendationCache.findMany({
        where: {
          userId,
          updatedAt: { gte: oneDayAgo }
        },
        orderBy: { finalScore: 'desc' },
        take: limit,
        include: {
          song: {
            include: {
              artists: {
                include: {
                  artist: {
                    include: { user: { select: { username: true, displayName: true } } }
                  }
                }
              }
            }
          }
        }
      });

      if (cached.length > 0) {
        // Trích xuất danh sách bài hát từ cache
        const recommendedSongs = cached
          .map(c => c.song)
          .filter(song => song && !song.isDeleted && song.status === 'approved');
          
        if (recommendedSongs.length > 0) {
          console.log(`⚡ Lấy gợi ý cho user ${userId} từ Cache thành công!`);
          return res.status(200).json(recommendedSongs);
        }
      }

      // 2. Không có cache hoặc cache quá hạn. Chạy truy vấn pgvector trực tiếp bằng raw SQL
      console.log(`🤖 Tính toán tương đồng vector thời gian thực cho user ${userId}...`);
      
      // Kiểm tra xem User này có vector nhúng hay chưa
      const userArray = await prisma.$queryRaw`
        SELECT "collaborativeVector"::text as collaborative_vector, 
               "contentVector"::text as content_vector 
        FROM "User"
        WHERE id = ${userId} AND "isActive" = true
      `;
      const user = userArray[0];
      const hasVectors = user && (user.collaborative_vector || user.content_vector);

      if (!hasVectors) {
        console.log(`❄️ User ${userId} là Cold Start. Trả về nhạc thịnh hành thịnh hành...`);
        return await recommendationController.getTrendingFallback(res, limit);
      }

      // Thực hiện truy vấn tương đồng Cosine kết hợp (Lọc cộng tác 0.7 + Nội dung 0.3)
      const recommendations = await prisma.$queryRaw`
        SELECT s.id, s.title, s."artistName", s."audioUrl", s."coverArtUrl", s."playCount", s."durationMs",
               COALESCE(
                 0.7 * (CASE WHEN u."collaborativeVector" IS NOT NULL AND s."collaborativeVector" IS NOT NULL 
                             THEN (1 - (u."collaborativeVector" <=> s."collaborativeVector")) 
                             ELSE 0.0 END) +
                 0.3 * (CASE WHEN u."contentVector" IS NOT NULL AND s."contentVector" IS NOT NULL 
                             THEN (1 - (u."contentVector" <=> s."contentVector")) 
                             ELSE 0.0 END),
                 0.0
               ) AS score
        FROM "Song" s, "User" u
        WHERE u.id = ${userId} AND s."isDeleted" = false AND s.status = 'approved'
          -- Loại trừ các bài hát user đã nghe trong vòng 7 ngày qua để tạo cảm giác tươi mới
          AND s.id NOT IN (
              SELECT "songId" FROM "Interaction" 
              WHERE "userId" = ${userId} AND "timeStamp" > NOW() - INTERVAL '7 days'
          )
        ORDER BY score DESC, s."playCount" DESC
        LIMIT ${limit}
      `;

      // Nếu không tìm được bài nào hoặc toàn bộ điểm số = 0 (ALS chưa được fit)
      if (!recommendations || recommendations.length === 0 || recommendations.every(r => r.score === 0)) {
        console.log("⚠️ Kết quả vector tương đồng trống hoặc điểm số bằng 0. Fallback sang trending.");
        return await recommendationController.getTrendingFallback(res, limit);
      }

      // 3. Cập nhật Cache mới cho User bất đồng bộ (tránh làm chậm API response)
      recommendationController.updateCacheInBackground(userId, recommendations).catch(err => {
        console.error("Lỗi cập nhật Recommendation Cache:", err);
      });

      // Lấy chi tiết thông tin nghệ sĩ của các bài hát gợi ý để trả về cho Frontend
      const songIds = recommendations.map(r => r.id);
      const songsWithArtists = await prisma.song.findMany({
        where: { id: { in: songIds } },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          }
        }
      });

      // Sắp xếp lại danh sách bài hát theo đúng thứ tự điểm số từ cao đến thấp của pgvector
      const orderedSongs = songIds
        .map(id => songsWithArtists.find(s => s.id === id))
        .filter(Boolean);

      return res.status(200).json(orderedSongs);

    } catch (error) {
      console.error("Lỗi getRecommendations:", error);
      // Fallback cuối cùng nếu lỗi hệ thống
      return await recommendationController.getTrendingFallback(res, limit);
    }
  },

  /**
   * GET /api/recommendations/songs/:songId/similar
   * Lấy danh sách các bài hát tương tự một bài hát cụ thể (More Like This).
   * Sử dụng pgvector cosine similarity trên contentVector.
   */
  getSimilarSongs: async (req, res) => {
    try {
      const songId = parseInt(req.params.songId);
      const limit = parseInt(req.query.limit) || 10;

      // 1. Kiểm tra xem bài hát gốc có contentVector hay không
      const originSongArray = await prisma.$queryRaw`
        SELECT "contentVector"::text as content_vector FROM "Song"
        WHERE id = ${songId} AND "isDeleted" = false
      `;
      const originSong = originSongArray[0];

      if (!originSong || !originSong.content_vector) {
        console.log(`❄️ Bài hát ${songId} không có Content Vector. Fallback sang gợi ý cùng Thể loại...`);
        return await recommendationController.getGenreFallback(res, songId, limit);
      }

      // 2. Truy vấn pgvector cosine similarity
      const similarSongs = await prisma.$queryRaw`
        SELECT target.id, target.title, target."artistName", target."audioUrl", target."coverArtUrl", target."playCount", target."durationMs",
               (1 - (origin."contentVector" <=> target."contentVector")) as similarity_score
        FROM "Song" origin, "Song" target
        WHERE origin.id = ${songId} AND target.id != ${songId}
          AND target."isDeleted" = false AND target.status = 'approved'
          AND origin."contentVector" IS NOT NULL AND target."contentVector" IS NOT NULL
        ORDER BY similarity_score DESC, target."playCount" DESC
        LIMIT ${limit}
      `;

      if (!similarSongs || similarSongs.length === 0) {
        return await recommendationController.getGenreFallback(res, songId, limit);
      }

      // Lấy đầy đủ thông tin nghệ sĩ
      const songIds = similarSongs.map(s => s.id);
      const songsWithArtists = await prisma.song.findMany({
        where: { id: { in: songIds } },
        include: {
          artists: {
            include: {
              artist: {
                include: { user: { select: { username: true, displayName: true } } }
              }
            }
          }
        }
      });

      const orderedSimilar = songIds
        .map(id => songsWithArtists.find(s => s.id === id))
        .filter(Boolean);

      return res.status(200).json(orderedSimilar);

    } catch (error) {
      console.error("Lỗi getSimilarSongs:", error);
      return res.status(500).json({ error: "Lỗi server khi tìm nhạc tương tự" });
    }
  },

  /**
   * POST /api/admin/recommendations/train
   * Trigger huấn luyện lại mô hình ML bất đồng bộ.
   */
  triggerTraining: async (req, res) => {
    try {
      console.log("Triggering Python ML service training pipeline...");
      
      const response = await fetch(`${ML_API_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || "Không thể trigger huấn luyện" });
      }

      return res.status(200).json({ 
        message: "Đã kích hoạt tiến trình huấn luyện ngầm thành công!", 
        ml_status: data 
      });

    } catch (error) {
      console.error("Lỗi triggerTraining:", error);
      return res.status(500).json({ error: "Không kết nối được tới dịch vụ Python ML" });
    }
  },

  // Helper: Cập nhật bộ nhớ đệm
  updateCacheInBackground: async (userId, recommendations) => {
    try {
      // Dùng transaction xóa cache cũ và thêm cache mới
      await prisma.$transaction([
        prisma.recommendationCache.deleteMany({ where: { userId } }),
        prisma.recommendationCache.createMany({
          data: recommendations.map(rec => ({
            userId,
            songId: rec.id,
            finalScore: parseFloat(rec.score) || 0.0
          }))
        })
      ]);
      console.log(`💾 Đã cập nhật Cache cho user ${userId} (${recommendations.length} bản ghi).`);
    } catch (err) {
      console.error("Lỗi cập nhật Cache ngầm:", err);
    }
  },

  // Helper Fallback: Lấy các bài hát thịnh hành nhất
  getTrendingFallback: async (res, limit) => {
    const trending = await prisma.song.findMany({
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
      orderBy: [
        { playCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });
    return res.status(200).json(trending);
  },

  // Helper Fallback: Lấy các bài hát cùng thể loại
  getGenreFallback: async (res, songId, limit) => {
    const genres = await prisma.songGenre.findMany({
      where: { songId },
      select: { genreId: true }
    });
    const genreIds = genres.map(g => g.genreId);

    const similar = await prisma.song.findMany({
      where: {
        id: { not: songId },
        isDeleted: false,
        status: 'approved',
        genres: { some: { genreId: { in: genreIds } } }
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
      take: limit
    });

    return res.status(200).json(similar);
  }
};

module.exports = recommendationController;
