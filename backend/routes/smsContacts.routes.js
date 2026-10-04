const express = require('express');
const router = express.Router();
const smsContactsController = require('../controllers/smsContacts.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Roles that can see the SMS module in the UI (frontend LEADERSHIP_ROLES) —
// reads are gated to the same set so member accounts cannot dump the church's
// contact list (PII: names, phones, emails).
const SMS_READ_ROLES = [
  'Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Elder', 'Deacon',
  'Deaconess', 'Church Board Member', 'Department Head',
  'Assistant Department Head', 'Subcommittee Head'
];

// All routes require authentication
router.use(authenticateToken);

// Contact CRUD operations
router.get('/', requireRole(SMS_READ_ROLES), smsContactsController.getContacts);
router.get('/export', requireRole(SMS_READ_ROLES), smsContactsController.exportContacts);
router.post('/import', requireRole(['Super Admin', 'Pastor', 'Department Head']), upload.single('file'), smsContactsController.importContacts);
router.get('/:id', requireRole(SMS_READ_ROLES), smsContactsController.getContact);
router.post('/', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsContactsController.createContact);
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsContactsController.updateContact);
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), smsContactsController.deleteContact);

module.exports = router;