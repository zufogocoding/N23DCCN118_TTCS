const express = require("express");
const router = express.Router();
const {
  getAllSystemPlaylists,
  createSystemPlaylist,
  getSystemPlaylistById,
  updateSystemPlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderSongs,
  reorderSystemPlaylists
} = require("../controllers/systemPlaylistController");

const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const { uploadPlaylistCover } = require("../middlewares/uploadMiddleware");

router.get("/api/admin/system-playlists", authMiddleware, requireAdmin, getAllSystemPlaylists);
router.post("/api/admin/system-playlists", authMiddleware, requireAdmin, uploadPlaylistCover.single('cover'), createSystemPlaylist);
router.put("/api/admin/system-playlists/reorder", authMiddleware, requireAdmin, reorderSystemPlaylists);
router.get("/api/admin/system-playlists/:id", authMiddleware, requireAdmin, getSystemPlaylistById);
router.put("/api/admin/system-playlists/:id", authMiddleware, requireAdmin, uploadPlaylistCover.single('cover'), updateSystemPlaylist);
router.post("/api/admin/system-playlists/:id/songs", authMiddleware, requireAdmin, addSongToPlaylist);
router.delete("/api/admin/system-playlists/:id/songs/:songId", authMiddleware, requireAdmin, removeSongFromPlaylist);
router.put("/api/admin/system-playlists/:id/songs/reorder", authMiddleware, requireAdmin, reorderSongs);

module.exports = router;
