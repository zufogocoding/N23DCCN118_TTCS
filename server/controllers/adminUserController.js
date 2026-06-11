const prisma = require('../db/index');

const adminUserController = {
  /**
   * GET /api/admin/users
   * Lấy danh sách tất cả users với filter, search, phân trang
   */
  getAllUsers: async (req, res) => {
    try {
      const { search = '', status = 'all', role = 'all', page = 1, limit = 20 } = req.query;
 
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
 
      const where = {};
 
      // Filter theo status (active/banned)
      if (status === 'active') where.isActive = true;
      else if (status === 'banned') where.isActive = false;
 
      // Filter theo role
      if (role === 'admin') where.isAdmin = true;
      else if (role === 'artist') where.artist = { isNot: null };
      else if (role === 'user') {
        where.isAdmin = false;
        where.artist = null;
      }
 
      // Search theo username hoặc email
      if (search.trim()) {
        where.OR = [
          { username: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { displayName: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }
 
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            isAdmin: true,
            isActive: true,
            role: true,
            country: true,
            createdAt: true,
            lastLogin: true,
            artist: {
              select: {
                verifiedTick: true,
                status: true,
                followerCount: true,
              }
            },
            _count: {
              select: {
                playlists: true,
                interactions: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.user.count({ where }),
      ]);
 
      res.status(200).json({
        users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        }
      });
    } catch (error) {
      console.error('Lỗi getAllUsers (admin):', error);
      res.status(500).json({ error: 'Lỗi server khi lấy danh sách người dùng' });
    }
  },
 
  /**
   * GET /api/admin/users/:id
   * Xem chi tiết 1 user
   */
  getUserById: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID không hợp lệ' });
 
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          coverImageUrl: true,
          bio: true,
          dob: true,
          country: true,
          isAdmin: true,
          isActive: true,
          isVerified: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          artist: {
            select: {
              verifiedTick: true,
              status: true,
              followerCount: true,
            }
          },
          artistRequest: {
            select: {
              status: true,
              createdAt: true,
            }
          },
          _count: {
            select: {
              playlists: true,
              interactions: true,
              follows: true,
              followedBy: true,
            }
          }
        }
      });
 
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
 
      res.status(200).json(user);
    } catch (error) {
      console.error('Lỗi getUserById (admin):', error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },
 
  /**
   * PUT /api/admin/users/:id/ban
   * Ban user (isActive = false)
   */
  banUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID không hợp lệ' });
 
      // Không được ban chính mình
      if (req.user.id === userId) {
        return res.status(400).json({ error: 'Không thể tự ban tài khoản của mình' });
      }
 
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
 
      if (!user.isActive) {
        return res.status(400).json({ error: 'Tài khoản này đã bị ban rồi' });
      }
 
      // Không được ban admin khác
      if (user.isAdmin) {
        return res.status(403).json({ error: 'Không thể ban tài khoản Admin' });
      }
 
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
 
      res.status(200).json({ message: `Đã ban tài khoản ${user.username}` });
    } catch (error) {
      console.error('Lỗi banUser:', error);
      res.status(500).json({ error: 'Lỗi server khi ban user' });
    }
  },
 
  /**
   * PUT /api/admin/users/:id/unban
   * Unban user (isActive = true)
   */
  unbanUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID không hợp lệ' });
 
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
 
      if (user.isActive) {
        return res.status(400).json({ error: 'Tài khoản này đang hoạt động bình thường' });
      }
 
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });
 
      res.status(200).json({ message: `Đã unban tài khoản ${user.username}` });
    } catch (error) {
      console.error('Lỗi unbanUser:', error);
      res.status(500).json({ error: 'Lỗi server khi unban user' });
    }
  },
 
  /**
   * PUT /api/admin/users/:id/promote
   * Cấp quyền Admin cho user
   */
  promoteToAdmin: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID không hợp lệ' });
 
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
 
      if (user.isAdmin) {
        return res.status(400).json({ error: 'Người dùng này đã là Admin rồi' });
      }
 
      await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: true, role: 'admin' },
      });
 
      res.status(200).json({ message: `Đã cấp quyền Admin cho ${user.username}` });
    } catch (error) {
      console.error('Lỗi promoteToAdmin:', error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },
 
  /**
   * PUT /api/admin/users/:id/demote
   * Thu hồi quyền Admin
   */
  demoteAdmin: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID không hợp lệ' });
 
      if (req.user.id === userId) {
        return res.status(400).json({ error: 'Không thể tự thu hồi quyền Admin của mình' });
      }
 
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
 
      if (!user.isAdmin) {
        return res.status(400).json({ error: 'Người dùng này không phải Admin' });
      }
 
      await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: false, role: 'user' },
      });
 
      res.status(200).json({ message: `Đã thu hồi quyền Admin của ${user.username}` });
    } catch (error) {
      console.error('Lỗi demoteAdmin:', error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },
 
  /**
   * DELETE /api/admin/users/:id
   * Xóa vĩnh viễn user (cascade xóa mọi dữ liệu liên quan)
   */
  deleteUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: 'ID không hợp lệ' });
 
      if (req.user.id === userId) {
        return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
      }
 
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
 
      if (user.isAdmin) {
        return res.status(403).json({ error: 'Không thể xóa tài khoản Admin' });
      }
 
      await prisma.user.delete({ where: { id: userId } });
 
      res.status(200).json({ message: `Đã xóa tài khoản ${user.username}` });
    } catch (error) {
      console.error('Lỗi deleteUser (admin):', error);
      res.status(500).json({ error: 'Lỗi server khi xóa user' });
    }
  },
};
 
module.exports = adminUserController;

