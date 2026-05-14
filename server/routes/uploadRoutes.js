const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/uploadController');

router.post('/api/upload/song', uploadController.uploadSong);

module.exports = router;