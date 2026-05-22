const express = require("express");
const router = express.Router();

const {
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

router.patch("/api/admin/song/:id/approve", approveSong);
router.patch("/api/admin/song/:id/reject", rejectSong);

module.exports = router;