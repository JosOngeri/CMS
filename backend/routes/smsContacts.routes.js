const express = require('express');
const router = express.Router();
const smsContactsController = require('../controllers/smsContacts.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticateToken);

// Contact CRUD operations
router.get('/', smsContactsController.getContacts);
router.get('/export', smsContactsController.exportContacts);
router.post('/import', requireRole(['Super Admin', 'Pastor', 'Department Head']), upload.single('file'), smsContactsController.importContacts);
router.get('/:id', smsContactsController.getContact);
router.post('/', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsContactsController.createContact);
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsContactsController.updateContact);
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), smsContactsController.deleteContact);

module.exports = router;