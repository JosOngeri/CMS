const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collection.controller');
const { authenticateToken } = require('../middleware/auth');

// All collection routes require authentication
router.use(authenticateToken);

// Personal collections routes
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
