const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collection.controller');
const { authenticateToken } = require('../middleware/auth');

// All collection routes require authentication
router.use(authenticateToken);

// Reject non-UUID :id/:contributionId before they hit pg — a bad value
// previously crashed the handler with invalid_text_representation (500).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for (const paramName of ['id', 'contributionId']) {
  router.param(paramName, (req, res, next, value) => {
    if (!UUID_RE.test(value)) {
      return res.status(400).json({ success: false, error: `Invalid ${paramName} format` });
    }
    next();
  });
}

// Personal collections routes
router.get('/', collectionController.getCollections);
router.get('/my-collections', collectionController.getMyCollections);
router.get('/my-statement', collectionController.getMyStatement);
router.post('/', collectionController.createPersonalCollection);

// Event collection routes
router.post('/event', collectionController.createCollection);

// Get collection details
router.get('/:id', collectionController.getCollection);

// Update collection
router.put('/:id', collectionController.updateCollection);

// Update collection status
router.put('/:id/status', collectionController.updateCollectionStatus);

// Add contribution to collection
router.post('/:id/contributions', collectionController.addContribution);

// Get contributions for a collection
router.get('/:id/contributions', collectionController.getContributions);

// Delete contribution (admin only)
router.delete('/:id/contributions/:contributionId', collectionController.deleteContribution);

// Collection analytics
router.get('/:id/analytics', collectionController.getCollectionAnalytics);

// Close collection
router.put('/:id/close', collectionController.closeCollection);

// Reopen collection
router.put('/:id/reopen', collectionController.reopenCollection);

module.exports = router;
