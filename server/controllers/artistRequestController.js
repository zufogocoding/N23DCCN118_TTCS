const prisma = require('../db/index');
const fs = require('fs');

const artistRequestController = {
  // 1. User tạo yêu cầu làm nghệ sĩ
  createRequest: async (req, res) => {
    try {
      const userId = req.user.id;
      const { artistName } = req.body;

      // Bảo mật: Kiểm tra tài khoản có bị khóa không
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa hoặc không tồn tại." });
      }

      // Kiểm tra user đã là nghệ sĩ chưa
      const existingArtist = await prisma.artist.findUnique({ where: { userId } });
      if (existingArtist) {
        return res.status(400).json({ error: "Bạn đã là nghệ sĩ rồi!" });
      }

      // Kiểm tra xem user có yêu cầu nào đang chờ không
      const existingRequest = await prisma.artistRequest.findUnique({ where: { userId } });
      if (existingRequest && existingRequest.status === 'PENDING') {
        return res.status(400).json({ error: "Bạn đã gửi yêu cầu trước đó và đang chờ duyệt!" });
      }

      if (!req.files || !req.files['idCard'] || !req.files['demoTrack']) {
        return res.status(400).json({ error: "Vui lòng upload đủ ID Card và Demo Track" });
      }

      const idCardUrl = `/uploads/artist_requests/${req.files['idCard'][0].filename}`;
      const demoTrackUrl = `/uploads/artist_requests/${req.files['demoTrack'][0].filename}`;

      // Xóa request cũ nếu bị reject trước đó (trường hợp tạo mới hoàn toàn thay vì gọi API resubmit)
      if (existingRequest && existingRequest.status === 'REJECTED') {
        await prisma.artistRequest.delete({ where: { userId } });
      }

      const newRequest = await prisma.artistRequest.create({
        data: {
          userId,
          artistName,
          idCardUrl,
          demoTrackUrl,
          status: 'PENDING'
        }
      });

      res.status(201).json({ message: "Gửi yêu cầu thành công!", request: newRequest });
    } catch (error) {
      console.error("Lỗi createRequest:", error);
      res.status(500).json({ error: `Lỗi server khi tạo yêu cầu: ${error.message}` });
    }
  },

  // 2. Admin lấy danh sách yêu cầu chờ duyệt
  getPendingRequests: async (req, res) => {
    try {
      const requests = await prisma.artistRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(requests);
    } catch (error) {
      console.error("Lỗi getPendingRequests:", error);
      res.status(500).json({ error: "Lỗi server khi lấy danh sách" });
    }
  },

  // 3. Admin duyệt yêu cầu
  approveRequest: async (req, res) => {
    try {
      const { id } = req.params;
      
      const request = await prisma.artistRequest.findUnique({ where: { id: parseInt(id) } });
      if (!request) return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
      if (request.status !== 'PENDING') return res.status(400).json({ error: "Yêu cầu này đã được xử lý" });

      // Dùng transaction để đảm bảo tất cả thay đổi thành công hoặc rollback
      const result = await prisma.$transaction(async (tx) => {
        // 1. Cập nhật trạng thái thành APPROVED
        await tx.artistRequest.update({
          where: { id: parseInt(id) },
          data: { status: 'APPROVED', rejectionReason: null }
        });

        // 2. Tạo bản ghi Artist
        const newArtist = await tx.artist.create({
          data: {
            userId: request.userId,
            verifiedTick: true
          }
        });

        // 3. Cập nhật role của User thành "artist", set isVerified = true và cập nhật displayName
        await tx.user.update({
          where: { id: request.userId },
          data: { 
            role: 'artist', 
            isVerified: true,
            displayName: request.artistName
          }
        });

        // 4. Tạo thông báo cho user
        await tx.notification.create({
          data: {
            userId: request.userId,
            message: `🎵 Chúc mừng! Yêu cầu trở thành nghệ sĩ của bạn đã được chấp thuận. Nghệ danh: ${request.artistName}`,
            type: 'artist_approved',
            targetType: 'ARTIST',
            targetId: request.userId,
            actionUrl: `/artist/${request.userId}`,
          }
        });

        return newArtist;
      });

      res.status(200).json({ message: "Đã duyệt yêu cầu thành công!", artist: result });
    } catch (error) {
      console.error("Lỗi approveRequest:", error);
      res.status(500).json({ error: "Lỗi server khi duyệt yêu cầu" });
    }
  },

  // 4. Admin từ chối yêu cầu
  rejectRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      
      const request = await prisma.artistRequest.findUnique({ where: { id: parseInt(id) } });
      if (!request) return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
      if (request.status !== 'PENDING') return res.status(400).json({ error: "Yêu cầu này đã được xử lý" });

      // Dùng transaction
      await prisma.$transaction(async (tx) => {
        // 1. Cập nhật trạng thái thành REJECTED và lưu lý do từ chối
        await tx.artistRequest.update({
          where: { id: parseInt(id) },
          data: { 
            status: 'REJECTED',
            rejectionReason: rejectionReason || null
          }
        });

        // 2. Tạo thông báo cho user kèm lý do từ chối cụ thể
        const reasonText = rejectionReason ? ` Lý do: ${rejectionReason}.` : '';
        await tx.notification.create({
          data: {
            userId: request.userId,
            message: `Yêu cầu trở thành nghệ sĩ của bạn đã bị từ chối.${reasonText} Bạn có thể chỉnh sửa và gửi lại yêu cầu mới.`,
            type: 'artist_rejected',
            targetType: 'ARTIST_REQUEST',
            targetId: request.id,
            actionUrl: '/register-artist',
          }
        });
      });

      res.status(200).json({ message: "Đã từ chối yêu cầu!" });
    } catch (error) {
      console.error("Lỗi rejectRequest:", error);
      res.status(500).json({ error: "Lỗi server khi từ chối yêu cầu" });
    }
  },

  // 5. User kiểm tra trạng thái yêu cầu của mình
  getMyRequestStatus: async (req, res) => {
    try {
      const userId = req.user.id;

      // Kiểm tra xem user đã là nghệ sĩ chưa
      const artist = await prisma.artist.findUnique({ 
        where: { userId },
        include: { user: true }
      });
      if (artist) {
        return res.status(200).json({ 
          status: 'IS_ARTIST', 
          artistName: artist.user.displayName,
          message: 'Bạn đã là nghệ sĩ!' 
        });
      }

      // Kiểm tra yêu cầu hiện tại
      const request = await prisma.artistRequest.findUnique({ where: { userId } });
      if (!request) {
        return res.status(200).json({ status: 'NO_REQUEST' });
      }

      res.status(200).json({ 
        status: request.status, 
        artistName: request.artistName,
        createdAt: request.createdAt,
        rejectionReason: request.rejectionReason,
        idCardUrl: request.idCardUrl,
        demoTrackUrl: request.demoTrackUrl
      });
    } catch (error) {
      console.error("Lỗi getMyRequestStatus:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // 6. User nộp lại hồ sơ sau khi bị từ chối
  resubmitRequest: async (req, res) => {
    try {
      const userId = req.user.id;
      const { artistName } = req.body;

      // Bảo mật: Kiểm tra tài khoản có bị khóa không
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa hoặc không tồn tại." });
      }

      // Kiểm tra user đã là nghệ sĩ chưa
      const existingArtist = await prisma.artist.findUnique({ where: { userId } });
      if (existingArtist) {
        return res.status(400).json({ error: "Bạn đã là nghệ sĩ rồi!" });
      }

      // Kiểm tra yêu cầu cũ có phải là REJECTED không
      const request = await prisma.artistRequest.findUnique({ where: { userId } });
      if (!request) {
        return res.status(404).json({ error: "Không tìm thấy hồ sơ cũ để nộp lại." });
      }

      if (request.status !== 'REJECTED') {
        return res.status(400).json({ error: "Bạn chỉ có thể gửi lại hồ sơ khi đơn cũ bị từ chối." });
      }

      let idCardUrl = request.idCardUrl;
      let demoTrackUrl = request.demoTrackUrl;

      // Nếu có upload file mới thì thay thế file cũ
      if (req.files) {
        if (req.files['idCard'] && req.files['idCard'][0]) {
          idCardUrl = `/uploads/artist_requests/${req.files['idCard'][0].filename}`;
        }
        if (req.files['demoTrack'] && req.files['demoTrack'][0]) {
          demoTrackUrl = `/uploads/artist_requests/${req.files['demoTrack'][0].filename}`;
        }
      }

      const updatedRequest = await prisma.artistRequest.update({
        where: { userId },
        data: {
          artistName: artistName || request.artistName,
          idCardUrl,
          demoTrackUrl,
          status: 'PENDING',
          rejectionReason: null // Xóa lý do từ chối cũ
        }
      });

      res.status(200).json({ message: "Nộp lại hồ sơ thành công! Vui lòng chờ Admin phê duyệt.", request: updatedRequest });
    } catch (error) {
      console.error("Lỗi resubmitRequest:", error);
      res.status(500).json({ error: `Lỗi server khi gửi lại hồ sơ: ${error.message}` });
    }
  }
};

module.exports = artistRequestController;
