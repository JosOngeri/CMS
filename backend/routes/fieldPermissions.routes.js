const express = require('express');
const router = express.Router();
const fieldPermissionsController = require('../controllers/fieldPermissions.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get field permissions for a role and module
router.get('/', fieldPermissionsController.getFieldPermissions);

// Set field permissions (Super Admin only)
router.post('/', requireRole(['Super Admin']), fieldPermissionsController.setFieldPermissions);

// Get module permissions for current user
router.get('/module/:module', fieldPermissionsController.getModulePermissions);

// Check specific field permission
router.get('/check', fieldPermissionsController.checkFieldPermission);

module.exports = router;
