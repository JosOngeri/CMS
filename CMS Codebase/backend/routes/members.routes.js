const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all members with pagination and search
router.get('/', membersController.getAllMembers);

// Get member statistics
router.get('/stats', membersController.getMemberStats);

// Get single member by ID
router.get('/:id', membersController.getMemberById);

// Create new member
router.post('/', requireRole(['Super Admin', 'Pastor', 'First Elder']), membersController.createMember);

// Update member
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'First Elder']), membersController.updateMember);

// Delete member
router.delete('/:id', requireRole(['Super Admin']), membersController.deleteMember);

module.exports = router;
