const express = require("express");
const router = express.Router();
const { getHomeSystemPlaylists } = require("../controllers/systemPlaylistController");

router.get("/api/system-playlists/home", getHomeSystemPlaylists);

module.exports = router;
