const express = require("express");
const router = express.Router();

const {
  approveSong,
  rejectSong,
  getPendingSongs,
} = require("../controllers/adminSongController");

router.get("/api/admin/songs/pending", getPendingSongs);

router.patch("/api/admin/song/:id/approve", approveSong);

router.patch("/api/admin/song/:id/reject", rejectSong);

module.exports = router;