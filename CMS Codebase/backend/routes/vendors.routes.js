const express = require('express');
const router = express.Router();
const vendorsController = require('../controllers/vendors.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all vendors
router.get('/', vendorsController.getAllVendors);

// Get vendor by ID
router.get('/:id', vendorsController.getVendorById);

// Create vendor
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), vendorsController.createVendor);

// Update vendor
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), vendorsController.updateVendor);

// Delete vendor
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), vendorsController.deleteVendor);

module.exports = router;
