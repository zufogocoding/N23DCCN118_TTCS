const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");

const {
  getAllSongsAdmin,
  toggleSongVisibility,
  adminDeleteSong,
  setAdminSongStatus,
  approveSong,
  rejectSong,
  getPendingSongs,
  getPendingCount,
  getAllSongs,
  deleteSong,
} = require("../controllers/adminSongController");


router.get("/api/admin/songs", getAllSongs);
router.delete("/api/admin/songs/:id", deleteSong);

router.get("/api/admin/songs/pending", getPendingSongs);
router.get("/api/admin/songs/pending/count", getPendingCount);

// Existing routes (protected)
router.get("/api/admin/songs/pending", authMiddleware, requireAdmin, getPendingSongs);
router.get("/api/admin/songs/pending/count", authMiddleware, requireAdmin, getPendingCount);
router.patch("/api/admin/song/:id/approve", authMiddleware, requireAdmin, approveSong);
router.patch("/api/admin/song/:id/reject", authMiddleware, requireAdmin, rejectSong);


// New admin song management routes
router.get("/api/admin/songs", authMiddleware, requireAdmin, getAllSongsAdmin);
router.patch("/api/admin/songs/:id/visibility", authMiddleware, requireAdmin, toggleSongVisibility);
router.patch("/api/admin/songs/:id/status", authMiddleware, requireAdmin, setAdminSongStatus);
router.delete("/api/admin/songs/:id", authMiddleware, requireAdmin, adminDeleteSong);

module.exports = router;
