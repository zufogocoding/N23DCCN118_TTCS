const prisma = require('../db/index');
const { sendTakedownEmail } = require('../utils/emailService');

// GET /api/admin/reports
const getReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const reports = await prisma.report.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, email: true, avatarUrl: true }
        }
      }
    });

    const total = await prisma.report.count({ where });

    // Lấy thêm thông tin target
    const formattedReports = await Promise.all(reports.map(async (report) => {
      let targetInfo = null;
      try {
        if (report.targetType === 'SONG') {
          targetInfo = await prisma.song.findUnique({
            where: { id: report.targetId },
            select: { id: true, title: true, coverArtUrl: true, audioUrl: true, status: true, isDeleted: true, uploadedById: true }
          });
        } else if (report.targetType === 'ALBUM') {
          targetInfo = await prisma.album.findUnique({
            where: { id: report.targetId },
            select: { id: true, title: true, coverArtUrl: true, status: true, artistId: true }
          });
        } else if (report.targetType === 'ARTIST') {
          targetInfo = await prisma.artist.findUnique({
            where: { userId: report.targetId },
            include: {
              user: {
                select: { id: true, username: true, displayName: true, email: true, avatarUrl: true }
              }
            }
          });
        } else if (report.targetType === 'PLAYLIST') {
          targetInfo = await prisma.playlist.findUnique({
            where: { id: report.targetId },
            select: { id: true, title: true, coverArtUrl: true, userId: true }
          });
        }
      } catch (e) {
        console.warn(`Target không tìm thấy cho report #${report.id}:`, e.message);
      }

      return { ...report, targetInfo };
    }));

    res.json({
      reports: formattedReports,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách reports:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

// PUT /api/admin/reports/:id/resolve
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.report.findUnique({ where: { id: parseInt(id) } });
    if (!report) return res.status(404).json({ error: "Không tìm thấy báo cáo." });
    if (report.status !== 'PENDING') return res.status(400).json({ error: "Báo cáo này đã được xử lý." });

    let emailToSend = null;

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: parseInt(id) },
        data: { status: 'RESOLVED' }
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: 'report_resolved',
          message: 'Báo cáo của bạn đã được admin xử lý. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.',
          targetType: 'REPORT',
          targetId: report.id,
          actionUrl: '/profile',
        },
      });

      if (report.targetType === 'SONG') {
        // Chỉ đổi status, KHÔNG đặt isDeleted=true
        try {
          const updatedSong = await tx.song.update({
            where: { id: report.targetId },
            data: { status: 'rejected' }
          });

          if (updatedSong.uploadedById) {
            const userToEmail = await tx.user.findUnique({
              where: { id: updatedSong.uploadedById }
            });
            if (userToEmail) {
              emailToSend = {
                email: userToEmail.email,
                artistName: userToEmail.displayName || userToEmail.username,
                title: updatedSong.title,
                type: 'SONG',
                reason: report.reason,
                proofUrl: report.proofUrl
              };
            }

            await tx.notification.create({
              data: {
                userId: updatedSong.uploadedById,
                type: 'song_hidden',
                targetType: 'SONG',
                targetId: updatedSong.id,
                actionUrl: `/song/${updatedSong.id}`,
                message: `CẢNH BÁO: Bài hát "${updatedSong.title}" của bạn đã bị ẩn do vi phạm quy định (Lý do: ${report.reason}). Vui lòng kiểm tra email để biết hướng dẫn kháng cáo bản quyền.`
              }
            });
          }
        } catch (e) {
          console.warn(`Không thể cập nhật Song #${report.targetId}:`, e.message);
        }
      } else if (report.targetType === 'ALBUM') {
        // Thống nhất dùng 'banned' giống takedownAlbum
        try {
          const updatedAlbum = await tx.album.update({
            where: { id: report.targetId },
            data: { status: 'banned' }
          });

          if (updatedAlbum.artistId) {
            const userToEmail = await tx.user.findUnique({
              where: { id: updatedAlbum.artistId }
            });
            if (userToEmail) {
              emailToSend = {
                email: userToEmail.email,
                artistName: userToEmail.displayName || userToEmail.username,
                title: updatedAlbum.title,
                type: 'ALBUM',
                reason: report.reason,
                proofUrl: report.proofUrl
              };
            }

            await tx.notification.create({
              data: {
                userId: updatedAlbum.artistId,
                type: 'album_takedown',
                targetType: 'ALBUM',
                targetId: updatedAlbum.id,
                actionUrl: `/release/${updatedAlbum.id}`,
                message: `CẢNH BÁO: Album "${updatedAlbum.title}" của bạn đã bị gỡ bỏ do vi phạm quy định (Lý do: ${report.reason}). Vui lòng kiểm tra email để biết hướng dẫn kháng cáo bản quyền.`
              }
            });
          }
        } catch (e) {
          console.warn(`Không thể cập nhật Album #${report.targetId}:`, e.message);
        }
      } else if (report.targetType === 'ARTIST') {
        try {
          await tx.artist.update({
            where: { userId: report.targetId },
            data: { status: 'banned' }
          });

          await tx.user.update({
            where: { id: report.targetId },
            data: { isActive: false }
          });

          await tx.notification.create({
            data: {
              userId: report.targetId,
              type: 'account_banned',
              targetType: 'ARTIST',
              targetId: report.targetId,
              actionUrl: `/artist/${report.targetId}`,
              message: `Tài khoản nghệ sĩ của bạn đã bị khóa do vi phạm quy định nghiêm trọng (Lý do: ${report.reason}).`
            }
          });
        } catch (e) {
          console.warn(`Không thể cập nhật Artist #${report.targetId}:`, e.message);
        }
      } else if (report.targetType === 'PLAYLIST') {
        try {
          const updatedPlaylist = await tx.playlist.update({
            where: { id: report.targetId },
            data: { isPublic: false }
          });

          if (updatedPlaylist.userId) {
            const userToEmail = await tx.user.findUnique({
              where: { id: updatedPlaylist.userId }
            });
            if (userToEmail) {
              emailToSend = {
                email: userToEmail.email,
                artistName: userToEmail.displayName || userToEmail.username,
                title: updatedPlaylist.title,
                type: 'PLAYLIST',
                reason: report.reason,
                proofUrl: report.proofUrl
              };
            }

            await tx.notification.create({
              data: {
                userId: updatedPlaylist.userId,
                type: 'playlist_hidden',
                targetType: 'PLAYLIST',
                targetId: updatedPlaylist.id,
                actionUrl: `/playlist/${updatedPlaylist.id}`,
                message: `CẢNH BÁO: Playlist "${updatedPlaylist.title}" của bạn đã bị chuyển về trạng thái Riêng Tư do vi phạm quy định (Lý do: ${report.reason}).`
              }
            });
          }
        } catch (e) {
          console.warn(`Không thể cập nhật Playlist #${report.targetId}:`, e.message);
        }
      }
    });

    if (emailToSend) {
      sendTakedownEmail(
        emailToSend.email,
        emailToSend.artistName,
        emailToSend.title,
        emailToSend.type,
        emailToSend.reason,
        emailToSend.proofUrl
      ).catch(err => console.error("Lỗi khi gửi email takedown:", err));
    }

    res.json({ message: "Đã xử lý vi phạm thành công." });
  } catch (error) {
    console.error("Lỗi khi xử lý báo cáo (resolve):", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

// PUT /api/admin/reports/:id/warn
const warnReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.report.findUnique({ where: { id: parseInt(id) } });
    if (!report) return res.status(404).json({ error: "Không tìm thấy báo cáo." });
    if (report.status !== 'PENDING') return res.status(400).json({ error: "Báo cáo này đã được xử lý." });

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: parseInt(id) },
        data: { status: 'WARNED' }
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: 'report_resolved',
          message: 'Báo cáo của bạn đã được admin xem xét và chủ nội dung đã nhận cảnh cáo.',
          targetType: 'REPORT',
          targetId: report.id,
          actionUrl: '/profile',
        },
      });

      // Gửi cảnh cáo cho owner nhưng KHÔNG gỡ nội dung
      let ownerId = null;
      let targetTitle = '';

      if (report.targetType === 'SONG') {
        const song = await tx.song.findUnique({
          where: { id: report.targetId },
          select: { uploadedById: true, title: true }
        });
        if (song) { ownerId = song.uploadedById; targetTitle = song.title; }
      } else if (report.targetType === 'ALBUM') {
        const album = await tx.album.findUnique({
          where: { id: report.targetId },
          select: { artistId: true, title: true }
        });
        if (album) { ownerId = album.artistId; targetTitle = album.title; }
      } else if (report.targetType === 'ARTIST') {
        ownerId = report.targetId;
        targetTitle = 'tài khoản nghệ sĩ';
      } else if (report.targetType === 'PLAYLIST') {
        const playlist = await tx.playlist.findUnique({
          where: { id: report.targetId },
          select: { userId: true, title: true }
        });
        if (playlist) { ownerId = playlist.userId; targetTitle = playlist.title; }
      }

      if (ownerId) {
        await tx.notification.create({
          data: {
            userId: ownerId,
            type: 'report_warning',
            targetType: report.targetType,
            targetId: report.targetId,
            actionUrl: report.targetType === 'SONG' ? `/song/${report.targetId}` : report.targetType === 'ALBUM' ? `/release/${report.targetId}` : `/artist/${report.targetId}`,
            message: `Cảnh cáo: Nội dung "${targetTitle}" của bạn đã bị báo cáo vì "${report.reason}". Vui lòng kiểm tra và chỉnh sửa nếu cần. Nội dung vi phạm nhiều lần có thể bị gỡ bỏ.`
          }
        });
      }
    });

    res.json({ message: "Đã gửi cảnh cáo thành công." });
  } catch (error) {
    console.error("Lỗi khi cảnh cáo (warn):", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

// PUT /api/admin/reports/:id/reject
const rejectReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.report.findUnique({ where: { id: parseInt(id) } });
    if (!report) return res.status(404).json({ error: "Không tìm thấy báo cáo." });
    if (report.status !== 'PENDING') return res.status(400).json({ error: "Báo cáo này đã được xử lý." });

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: parseInt(id) },
        data: { status: 'REJECTED' }
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: 'report_rejected',
          message: 'Báo cáo của bạn đã được admin xem xét nhưng chưa đủ căn cứ để xử lý.',
          targetType: 'REPORT',
          targetId: report.id,
          actionUrl: '/profile',
        },
      });
    });

    res.json({ message: "Đã bác bỏ báo cáo." });
  } catch (error) {
    console.error("Lỗi khi bác bỏ báo cáo:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getReports,
  resolveReport,
  warnReport,
  rejectReport
};
