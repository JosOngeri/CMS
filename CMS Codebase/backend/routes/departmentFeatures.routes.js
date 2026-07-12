const express = require('express');
const router = express.Router();
const dfController = require('../controllers/departmentFeatures.controller');
const identityGuard = require('../middleware/identityGuard');
const { hasRole } = require('../middleware/roleGuard');

// Get all available features (authenticated users)
router.get('/features', identityGuard, dfController.getAllFeatures);

// Get features by category (authenticated users)
router.get('/features/category/:category', identityGuard, dfController.getFeaturesByCategory);

// Get feature categories (authenticated users)
router.get('/features/categories', identityGuard, dfController.getFeatureCategories);

// Get features for a specific department (authenticated users)
router.get('/departments/:departmentId/features', identityGuard, dfController.getDepartmentFeatures);

// Allocate feature to department (admin only)
router.post('/departments/:departmentId/features', identityGuard, hasRole(['Super Admin', 'Department Head']), dfController.allocateFeature);

// Remove feature from department (admin only)
router.delete('/departments/:departmentId/features/:featureSlug', identityGuard, hasRole(['Super Admin', 'Department Head']), dfController.removeFeature);

// Update feature configuration (admin only)
router.patch('/departments/:departmentId/features/:featureSlug/config', identityGuard, hasRole(['Super Admin', 'Department Head']), dfController.updateFeatureConfig);

module.exports = router;
