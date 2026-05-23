const prisma = require('../db/index');

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

    // Lấy thêm thông tin target (Ví dụ: bài hát)
    const formattedReports = await Promise.all(reports.map(async (report) => {
      let targetInfo = null;
      if (report.targetType === 'SONG') {
        const song = await prisma.song.findUnique({
          where: { id: report.targetId },
          select: { id: true, title: true, coverArtUrl: true, audioUrl: true, status: true, isDeleted: true, uploadedById: true }
        });
        targetInfo = song;
      }

      return {
        ...report,
        targetInfo
      };
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

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: parseInt(id) },
        data: { status: 'RESOLVED' }
      });

      if (report.targetType === 'SONG') {
        const updatedSong = await tx.song.update({
          where: { id: report.targetId },
          data: { status: 'rejected', isDeleted: true }
        });

        if (updatedSong.uploadedById) {
          await tx.notification.create({
            data: {
              userId: updatedSong.uploadedById,
              type: 'info',
              message: `CẢNH BÁO: Bài hát "${updatedSong.title}" của bạn đã bị gỡ bỏ do vi phạm quy định (Lý do bị báo cáo: ${report.reason}).`
            }
          });
        }
      }
    });

    res.json({ message: "Đã xử lý vi phạm thành công." });
  } catch (error) {
    console.error("Lỗi khi xử lý báo cáo (resolve):", error);
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

    await prisma.report.update({
      where: { id: parseInt(id) },
      data: { status: 'REJECTED' }
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
  rejectReport
};
