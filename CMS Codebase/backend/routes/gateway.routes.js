const express = require('express');
const router = express.Router();
const gatewayController = require('../controllers/gateway.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/register', gatewayController.registerDevice);
router.get('/status', gatewayController.getStatus);

module.exports = router;
