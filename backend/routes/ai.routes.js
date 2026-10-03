const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// .bind() — unbound method references lose `this` (aiContentService/logger),
// which crashed the handler before it could even send an error response.
router.post('/condense', aiController.condenseAnnouncement.bind(aiController));
router.get('/usage-stats', aiController.getUsageStats.bind(aiController));

module.exports = router;
