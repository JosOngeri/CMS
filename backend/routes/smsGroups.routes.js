const express = require('express');
const router = express.Router();
const smsGroupsController = require('../controllers/smsGroups.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Same set as frontend LEADERSHIP_ROLES — group membership lists expose
// member phone numbers, so reads are leadership-gated like the SMS UI.
const SMS_READ_ROLES = [
  'Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Elder', 'Deacon',
  'Deaconess', 'Church Board Member', 'Department Head',
  'Assistant Department Head', 'Subcommittee Head'
];

// All routes require authentication
router.use(authenticateToken);

// Group CRUD operations
router.get('/', requireRole(SMS_READ_ROLES), smsGroupsController.getGroups);
router.get('/:id', requireRole(SMS_READ_ROLES), smsGroupsController.getGroup);
router.get('/:id/members', requireRole(SMS_READ_ROLES), smsGroupsController.getGroupMembers);
router.post('/', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsGroupsController.createGroup);
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsGroupsController.updateGroup);
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), smsGroupsController.deleteGroup);

// Group member management
router.post('/:id/members', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsGroupsController.addGroupMembers);
router.delete('/:id/members', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsGroupsController.removeGroupMembers);

// Group permissions
router.post('/:id/permissions', requireRole(['Super Admin', 'Pastor']), smsGroupsController.setGroupPermissions);
router.get('/user/:userId/permissions', smsGroupsController.getUserGroupPermissions);

module.exports = router;