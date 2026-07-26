const express = require('express');
const router = express.Router();
const smsGroupsController = require('../controllers/smsGroups.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Group CRUD operations
router.get('/', smsGroupsController.getGroups);
router.get('/:id', smsGroupsController.getGroup);
router.get('/:id/members', smsGroupsController.getGroupMembers);
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