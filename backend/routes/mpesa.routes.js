const express = require('express');
const router = express.Router();
const MpesaService = require('../services/MpesaService');
const mpesaRepository = require('../repositories/MpesaRepository');
const logger = require('../config/logging');

/**
 * M-Pesa Routes (Phase 12)
 * Handles STK Push and callback endpoints
 */

// STK Push endpoint
router.post('/stk-push', async (req, res) => {
  try {
    const { phone, amount, churchId, reference, description } = req.body;
    
    if (!phone || !amount || !churchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone, amount, and churchId are required' 
      });
    }

    const result = await MpesaService.initiateSTK(phone, amount, churchId, reference, description);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('STK Push Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// M-Pesa callback endpoint
router.post('/callback', async (req, res) => {
  try {
    // Validate signature if configured
    const signature = req.headers['x-mpesa-signature'];
    const payload = JSON.stringify(req.body);
    
    if (signature && !MpesaService.validateSignature(signature, payload)) {
      logger.warn('Invalid M-Pesa callback signature');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    // Process the callback
    const result = await MpesaService.processCallback(req.body);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Callback Processing Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check transaction status
router.get('/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    const result = await MpesaService.checkTransactionStatus(checkoutRequestId);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Transaction Status Check Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Reverse transaction (refund)
router.post('/reverse', async (req, res) => {
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
      error: error.message 
    });
  }
});

// Get STK Push history for a church
router.get('/history/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await mpesaRepository.getSTKPushHistory(churchId, limit, offset);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('STK Push History Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;