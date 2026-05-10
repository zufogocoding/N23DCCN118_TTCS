// server/routes/interactRoutes.js
const express = require('express');
const router = express.Router();
const interactController = require('../controllers/interactController');

// POST /api/interactions
router.post('/', interactController.trackInteraction);

module.exports = router;
