const express = require('express');
const router = express.Router();
const smsAuthController = require('../controllers/smsAuth.controller');
const { authenticateToken } = require('../middleware/auth');

// SMS-specific authentication endpoints
router.post('/login', smsAuthController.smsLogin);
router.post('/refresh-token', smsAuthController.refreshToken);
router.post('/logout', smsAuthController.logout);

// SMS organization discovery (requires authentication)
router.get('/organization', authenticateToken, smsAuthController.getOrganization);

module.exports = router;
