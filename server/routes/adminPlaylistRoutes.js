const express = require("express");
const router = express.Router();
const { getAllPlaylists, deletePlaylist } = require("../controllers/adminPlaylistController");

router.get("/api/admin/playlists", getAllPlaylists);
router.delete("/api/admin/playlists/:id", deletePlaylist);

module.exports = router;
