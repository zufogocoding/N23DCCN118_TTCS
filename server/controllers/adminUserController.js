const prisma = require('../db/index');

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        isActive: true,
        isAdmin: true,
        isVerified: true,
        _count: {
          select: {
            playlists: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    res.json(users);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách user:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Tránh việc admin tự xóa chính mình
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(403).json({ error: "Không thể tự xóa tài khoản của chính mình." });
    }

    // Prisma Cascade delete sẽ xử lý xóa các bảng liên quan (Playlists, Interactions...)
    await prisma.user.delete({
      where: {
        id: parseInt(id),
      }
    });

    res.json({ message: "Đã xóa người dùng thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa user:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
};
