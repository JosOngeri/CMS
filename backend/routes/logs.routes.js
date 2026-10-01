const express = require('express');
const router = express.Router();
const { createLogger } = require('../helpers/controllerLogger');
const logger = createLogger('client-errors');

// Client-side error reports from the React ErrorBoundary.
// Authenticated or not — a crash screen shouldn't block reporting.
router.post('/client-error', (req, res) => {
  const { error, stack, componentStack, url, userAgent } = req.body || {};

  logger.error('CLIENT ERROR', {
    error: String(error || 'unknown').slice(0, 2000),
    stack: String(stack || '').slice(0, 4000),
    componentStack: String(componentStack || '').slice(0, 2000),
    url: String(url || '').slice(0, 500),
    userAgent: String(userAgent || '').slice(0, 300),
    userId: req.user?.id || null,
    churchId: req.user?.church_id || null,
  });

  res.status(202).json({ success: true });
});

module.exports = router;
