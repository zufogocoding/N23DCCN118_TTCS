const prisma = require('../db/index');

// Hàm xử lý tạo báo cáo mới
const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description, proofUrl } = req.body;
    const reporterId = req.user.id; // Lấy từ token qua middleware verifyToken

    // Kiểm tra đầu vào cơ bản
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc (targetType, targetId, reason)." });
    }

    // Đảm bảo targetType hợp lệ
    const validTargetTypes = ['SONG', 'ALBUM', 'ARTIST'];
    if (!validTargetTypes.includes(targetType.toUpperCase())) {
      return res.status(400).json({ error: "Loại đối tượng không hợp lệ." });
    }

    // Tạo báo cáo
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: targetType.toUpperCase(),
        targetId: parseInt(targetId),
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
