const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getAllSongsAdmin,
  toggleSongVisibility,
  adminDeleteSong,
  setAdminSongStatus,
  approveSong,
  rejectSong,
  getPendingSongs,
  getPendingCount,
} = require("../controllers/adminSongController");

// Existing routes (preserved)
router.get("/api/admin/songs/pending", getPendingSongs);
router.get("/api/admin/songs/pending/count", getPendingCount);
router.patch("/api/admin/song/:id/approve", approveSong);
router.patch("/api/admin/song/:id/reject", rejectSong);

// New admin song management routes
router.get("/api/admin/songs", authMiddleware, getAllSongsAdmin);
router.patch("/api/admin/songs/:id/visibility", authMiddleware, toggleSongVisibility);
router.patch("/api/admin/songs/:id/status", authMiddleware, setAdminSongStatus);
router.delete("/api/admin/songs/:id", authMiddleware, adminDeleteSong);

module.exports = router;