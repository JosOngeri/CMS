const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const telegramChurchController = require('../controllers/telegramChurch.controller');

router.use(authenticateToken);
router.use(requireRole(['Super Admin', 'Pastor', 'First Elder']));

router.get('/config', telegramChurchController.getConfig);
router.put('/config', telegramChurchController.saveConfig);
router.post('/sync', telegramChurchController.sync);

module.exports = router;
