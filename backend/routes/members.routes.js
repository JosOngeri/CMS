const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { importMembers } = require('../services/memberImport.service');

// All routes require authentication
router.use(authenticateToken);

// Bulk CSV import — rows normalized client-side; dedup on name+phone.
// Register before /:id so 'import' is not read as a member id.
router.post('/import', requireRole(['Super Admin', 'Pastor', 'First Elder']), async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows || rows.length === 0) {
    return res.status(400).json({ success: false, error: 'rows[] required — parsed member records' });
  }
  try {
    const result = await importMembers(req.user.church_id, rows);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Member import failed' });
  }
});

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
