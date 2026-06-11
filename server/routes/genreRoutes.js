const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

// CRUD Genre
router.get('/api/genres', genreController.getAllGenres);
router.post('/api/genres', authMiddleware, requireAdmin, genreController.createGenre);
router.put('/api/genres/:id', authMiddleware, requireAdmin, genreController.updateGenre);
router.delete('/api/genres/:id', authMiddleware, requireAdmin, genreController.deleteGenre);

module.exports = router;

