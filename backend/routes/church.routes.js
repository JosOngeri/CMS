const express = require('express');
const router = express.Router();
const churchController = require('../controllers/church.controller');
const { authenticateToken } = require('../middleware/auth');
const { hasRole } = require('../middleware/roleGuard');

// All church routes require authentication
router.use(authenticateToken);

// Public routes (for authenticated users to see their own church)
router.get('/my-church', churchController.getChurchBySlug);

// Super Admin only routes
router.get('/', hasRole(['Super Admin']), churchController.getAllChurches);
router.get('/:id', hasRole(['Super Admin']), churchController.getChurchById);
router.get('/slug/:slug', hasRole(['Super Admin']), churchController.getChurchBySlug);
router.post('/', hasRole(['Super Admin']), churchController.createChurch);
router.put('/:id', hasRole(['Super Admin']), churchController.updateChurch);
router.delete('/:id', hasRole(['Super Admin']), churchController.deleteChurch);
router.get('/:id/stats', hasRole(['Super Admin']), churchController.getChurchStats);
router.put('/:id/settings', hasRole(['Super Admin']), churchController.updateChurchSettings);

module.exports = router;