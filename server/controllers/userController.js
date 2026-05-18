// Force restart
const prisma = require('../db/index');
const fs = require('fs');

// Lấy thông tin profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        dob: true,
        country: true,
        avatarUrl: true,
        isAdmin: true,
        isActive: true,
        role: true,
        createdAt: true,
        artist: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const { artist, ...userData } = user;

    res.status(200).json({
      ...userData,
      isArtist: !!artist
    });
  } catch (error) {
    console.error("Lỗi getProfile:", error);
    res.status(500).json({ error: "Lỗi server khi lấy thông tin profile" });
  }
};

// Cập nhật thông tin profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, dob, country } = req.body;
    let avatarUrl = undefined;

    // Nếu có file ảnh được upload
    if (req.file) {
      // Lưu URL tương đối để FE có thể nối vào localhost:9000
      avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Xóa ảnh cũ (tùy chọn)
      const oldUser = await prisma.user.findUnique({ where: { id: userId } });
      if (oldUser && oldUser.avatarUrl && oldUser.avatarUrl.startsWith('/uploads/avatars/')) {
        const oldFilePath = `.${oldUser.avatarUrl}`;
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    const updatedData = {};
    if (displayName !== undefined) updatedData.displayName = displayName;
    if (dob !== undefined) {
      updatedData.dob = dob ? new Date(dob) : null;
    }
    if (country !== undefined) updatedData.country = country;
    if (avatarUrl !== undefined) updatedData.avatarUrl = avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        dob: true,
        country: true,
        avatarUrl: true,
      }
    });

    res.status(200).json({
      message: "Cập nhật profile thành công",
      user: updatedUser
    });
  } catch (error) {
    console.error("Lỗi updateProfile:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Username đã tồn tại" });
    }
    res.status(500).json({ error: "Lỗi server khi cập nhật profile" });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
