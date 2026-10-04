const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// AI calls cost money and usage stats are admin data — leadership only.
const AI_ROLES = ['Super Admin', 'Pastor', 'First Elder', 'Department Head'];

// .bind() — unbound method references lose `this` (aiContentService/logger),
// which crashed the handler before it could even send an error response.
router.post('/condense', requireRole(AI_ROLES), aiController.condenseAnnouncement.bind(aiController));
router.get('/usage-stats', requireRole(AI_ROLES), aiController.getUsageStats.bind(aiController));

module.exports = router;
