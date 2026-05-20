const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminAlbumController = require('../controllers/adminAlbumController');

// Danh sách albums (có filter, search, pagination)
router.get('/api/admin/albums', authMiddleware, adminAlbumController.listAlbums);

// Chi tiết album kèm tracks
router.get('/api/admin/albums/:albumId', authMiddleware, adminAlbumController.getAlbumDetail);

// Gỡ album (soft delete: status → banned)
router.patch('/api/admin/albums/:albumId/takedown', authMiddleware, adminAlbumController.takedownAlbum);

// Khôi phục album bị gỡ (status → released)
router.patch('/api/admin/albums/:albumId/restore', authMiddleware, adminAlbumController.restoreAlbum);

module.exports = router;
