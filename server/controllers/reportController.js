const prisma = require('../db/index');

const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description, proofUrl } = req.body;
    const reporterId = req.user.id;

    // Kiểm tra đầu vào cơ bản
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc (targetType, targetId, reason)." });
    }

    const validTargetTypes = ['SONG', 'ALBUM', 'ARTIST'];
    const normalizedType = targetType.toUpperCase();
    if (!validTargetTypes.includes(normalizedType)) {
      return res.status(400).json({ error: "Loại đối tượng không hợp lệ. Chỉ chấp nhận: SONG, ALBUM, ARTIST." });
    }

    const parsedTargetId = parseInt(targetId);
    if (isNaN(parsedTargetId)) {
      return res.status(400).json({ error: "targetId không hợp lệ." });
    }

    // Validate target tồn tại và chặn self-report
    if (normalizedType === 'SONG') {
      const song = await prisma.song.findFirst({
        where: { id: parsedTargetId, isDeleted: false },
        select: { id: true, uploadedById: true }
      });
      if (!song) return res.status(404).json({ error: "Bài hát không tồn tại hoặc đã bị xóa." });
      if (song.uploadedById === reporterId) {
        return res.status(400).json({ error: "Bạn không thể báo cáo nội dung của chính mình." });
      }
    } else if (normalizedType === 'ALBUM') {
      const album = await prisma.album.findFirst({
        where: { id: parsedTargetId },
        select: { id: true, artistId: true }
      });
      if (!album) return res.status(404).json({ error: "Album không tồn tại." });
      if (album.artistId === reporterId) {
        return res.status(400).json({ error: "Bạn không thể báo cáo nội dung của chính mình." });
      }
    } else if (normalizedType === 'ARTIST') {
      const artist = await prisma.artist.findFirst({
        where: { userId: parsedTargetId },
        select: { userId: true }
      });
      if (!artist) return res.status(404).json({ error: "Nghệ sĩ không tồn tại." });
      if (artist.userId === reporterId) {
        return res.status(400).json({ error: "Bạn không thể báo cáo chính mình." });
      }
    }

    // Chặn duplicate pending report
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: normalizedType,
        targetId: parsedTargetId,
        status: 'PENDING'
      }
    });
    if (existingReport) {
      return res.status(400).json({ error: "Bạn đã báo cáo nội dung này rồi. Vui lòng chờ admin xử lý." });
    }

    // Tạo báo cáo
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: normalizedType,
        targetId: parsedTargetId,
        reason,
        description,
        proofUrl,
      },
    });

    res.status(201).json({ message: "Báo cáo của bạn đã được gửi thành công. Admin sẽ xem xét sớm.", report });
  } catch (error) {
    console.error("Lỗi khi tạo báo cáo:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ." });
  }
};

module.exports = {
  createReport,
};
