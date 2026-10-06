const express = require('express');
const router = express.Router();
const smsGatewayController = require('../controllers/smsGateway.controller');

/**
 * Inbound provider callbacks — no user JWT. Authentication is the
 * provider's per-row callback_secret embedded in the path:
 *
 *   POST /api/sms/provider-callbacks/:provider/:token/delivery
 *   POST /api/sms/provider-callbacks/:provider/:token/topup
 *
 * Mounted BEFORE the authenticated /sms router in index.routes.js so these
 * requests are handled here and never fall through to authenticateToken.
 */
router.post('/:provider/:token/delivery', smsGatewayController.providerDeliveryCallback);
router.post('/:provider/:token/topup', smsGatewayController.providerTopupCallback);

module.exports = router;
