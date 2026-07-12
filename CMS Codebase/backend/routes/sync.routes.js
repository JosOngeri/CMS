const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/delta', syncController.getDelta);

module.exports = router;
