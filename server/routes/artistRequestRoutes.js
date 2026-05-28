const express = require('express');
const router = express.Router();
const artistRequestController = require('../controllers/artistRequestController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadArtistRequest } = require('../middlewares/uploadMiddleware');

// 1. User: Kiểm tra trạng thái yêu cầu của mình
router.get('/my-status', authMiddleware, artistRequestController.getMyRequestStatus);

// 2. User: Gửi yêu cầu làm nghệ sĩ
router.post('/request', authMiddleware, uploadArtistRequest.fields([
  { name: 'idCard', maxCount: 1 },
  { name: 'demoTrack', maxCount: 1 }
]), artistRequestController.createRequest);

// 2b. User: Gửi lại yêu cầu làm nghệ sĩ sau khi bị từ chối
router.put('/resubmit', authMiddleware, uploadArtistRequest.fields([
  { name: 'idCard', maxCount: 1 },
  { name: 'demoTrack', maxCount: 1 }
]), artistRequestController.resubmitRequest);

const requireAdmin = require('../middlewares/requireAdmin');

// 2. Admin: Xem danh sách yêu cầu chờ duyệt
router.get('/admin/pending', authMiddleware, requireAdmin, artistRequestController.getPendingRequests);

// 3. Admin: Duyệt yêu cầu
router.put('/admin/:id/approve', authMiddleware, requireAdmin, artistRequestController.approveRequest);

// 4. Admin: Từ chối yêu cầu
router.put('/admin/:id/reject', authMiddleware, requireAdmin, artistRequestController.rejectRequest);

module.exports = router;
