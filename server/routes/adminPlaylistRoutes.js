const express = require("express");
const router = express.Router();
const { getAllPlaylists, deletePlaylist, hidePlaylist } = require("../controllers/adminPlaylistController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");

// Require auth + admin for all playlist admin routes
router.get("/api/admin/playlists", authMiddleware, requireAdmin, getAllPlaylists);
router.put("/api/admin/playlists/:id/hide", authMiddleware, requireAdmin, hidePlaylist);
router.delete("/api/admin/playlists/:id", authMiddleware, requireAdmin, deletePlaylist);

module.exports = router;
