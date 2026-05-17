const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');

// CRUD Genre
router.get('/api/genres', genreController.getAllGenres);
router.post('/api/genres', genreController.createGenre);
router.put('/api/genres/:id', genreController.updateGenre);
router.delete('/api/genres/:id', genreController.deleteGenre);

module.exports = router;
