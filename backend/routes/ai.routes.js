const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/condense', aiController.condenseAnnouncement);
router.get('/usage-stats', aiController.getUsageStats);

module.exports = router;
