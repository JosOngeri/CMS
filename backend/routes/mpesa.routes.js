const express = require('express');
const router = express.Router();
const MpesaService = require('../services/MpesaService');
const mpesaRepository = require('../repositories/MpesaRepository');
const logger = require('../config/logging');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * M-Pesa Routes (Phase 12)
 * Handles STK Push and callback endpoints.
 *
 * Guard model:
 * - /callback stays public (Daraja calls it) but requires a valid
 *   signature whenever MPESA_CALLBACK_SECRET is configured.
 * - Everything else requires a logged-in user; reversal is privileged.
 */

// STK Push endpoint — authenticated: anonymous calls could spam phones
// and burn Daraja quota.
router.post('/stk-push', authenticateToken, async (req, res) => {
  try {
    // churchId comes from the verified JWT — req.body.churchId is ignored so a
    // caller cannot attribute a billable STK push to another church.
    const { phone, amount, reference, description } = req.body;
    const churchId = req.user.church_id;

    if (!phone || !amount || !churchId) {
      return res.status(400).json({
        success: false,
        error: 'Phone and amount are required'
      });
    }

    const result = await MpesaService.initiateSTK(phone, amount, churchId, reference, description);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('STK Push Error:', error);
    res.status(500).json({
      success: false,
      error: 'STK push failed'
    });
  }
});

// M-Pesa callback endpoint — public by necessity (Daraja posts here).
// If MPESA_CALLBACK_SECRET is configured, a valid signature becomes
// mandatory; without it anyone could forge payment confirmations.
router.post('/callback', async (req, res) => {
  try {
    const signature = req.headers['x-mpesa-signature'];
    const payload = JSON.stringify(req.body);

    // Fail closed: without a configured secret there is no way to distinguish
    // a real Daraja callback from a forged payment confirmation.
    if (!process.env.MPESA_CALLBACK_SECRET) {
      logger.error('M-Pesa callback rejected: MPESA_CALLBACK_SECRET is not configured');
      return res.status(503).json({ success: false, error: 'Callback endpoint is not configured' });
    }

    if (!signature || !MpesaService.validateSignature(signature, payload)) {
      logger.warn('M-Pesa callback rejected: missing or invalid signature');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    // Process the callback
    const result = await MpesaService.processCallback(req.body);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Callback Processing Error:', error);
    res.status(500).json({
      success: false,
      error: 'Callback processing failed'
    });
  }
});

// Check transaction status
router.get('/status/:checkoutRequestId', authenticateToken, async (req, res) => {
  try {
    if (!MpesaService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'M-Pesa is not configured',
        code: 'MPESA_NOT_CONFIGURED'
      });
    }
    const { checkoutRequestId } = req.params;
    
    const result = await MpesaService.checkTransactionStatus(checkoutRequestId);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Transaction Status Check Error:', error);
    if (error.code === 'MPESA_AUTH_FAILED') {
      return res.status(503).json({
        success: false,
        error: 'M-Pesa provider authentication failed',
        code: 'MPESA_NOT_CONFIGURED'
      });
    }
    if (error.code === 'MPESA_QUERY_FAILED' && (error.upstreamStatus === 400 || error.upstreamStatus === 404)) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.status(502).json({
      success: false,
      error: 'Transaction status check failed'
    });
  }
});

// Reverse transaction (refund) — privileged: moves real money back.
router.post('/reverse', authenticateToken,
  requireRole(['Super Admin', 'Treasurer']),
  async (req, res) => {
  try {
    const { transactionId, amount, remark } = req.body;
    
    if (!transactionId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID and amount are required' 
      });
    }

    const result = await MpesaService.reverseTransaction(transactionId, amount, remark);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Transaction Reversal Error:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction reversal failed'
    });
  }
});

// Get STK Push history — tenant-scoped: users see their own church,
// Super Admin may read across churches.
router.get('/history/:churchId', authenticateToken, async (req, res) => {
  try {
    const { churchId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const isSuperAdmin = (req.user?.roles || []).includes('Super Admin');
    if (!isSuperAdmin && String(req.user?.church_id) !== String(churchId)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const result = await mpesaRepository.getSTKPushHistory(churchId, limit, offset);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('STK Push History Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch STK push history'
    });
  }
});

module.exports = router;