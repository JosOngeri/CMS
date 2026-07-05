const express = require('express');
const router = express.Router();
const fixedAssetsController = require('../controllers/fixedAssets.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all fixed assets
router.get('/', fixedAssetsController.getAllFixedAssets);

// Get fixed asset by ID
router.get('/:id', fixedAssetsController.getFixedAssetById);

// Create fixed asset
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), fixedAssetsController.createFixedAsset);

// Update fixed asset
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), fixedAssetsController.updateFixedAsset);

// Delete fixed asset
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), fixedAssetsController.deleteFixedAsset);

// Record depreciation
router.post('/:id/depreciation', requireRole(['Super Admin', 'Pastor', 'Treasurer']), fixedAssetsController.recordDepreciation);

// Dispose asset
router.post('/:id/dispose', requireRole(['Super Admin', 'Pastor', 'Treasurer']), fixedAssetsController.disposeAsset);

// Get depreciation schedule
router.get('/:id/schedule', fixedAssetsController.getDepreciationSchedule);

module.exports = router;
