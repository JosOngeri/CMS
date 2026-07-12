const express = require('express');
const router = express.Router();
const documentApprovalController = require('../controllers/documentApproval.controller');
const { authenticateToken } = require('../middleware/auth');
const { hasRole } = require('../middleware/roleGuard');

// All document approval routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/document-approval/request
 * @desc    Create document approval request
 * @access  Private
 */
router.post('/request', documentApprovalController.createApprovalRequest);

/**
 * @route   GET /api/document-approval/pending
 * @desc    Get pending approvals for current user
 * @access  Private
 */
router.get('/pending', documentApprovalController.getPendingApprovals);

/**
 * @route   GET /api/document-approval/document/:documentId/history
 * @desc    Get approval history for a document
 * @access  Private
 */
router.get('/document/:documentId/history', documentApprovalController.getDocumentApprovalHistory);

/**
 * @route   POST /api/document-approval/:approvalRequestId/approve
 * @desc    Approve document
 * @access  Private
 */
router.post('/:approvalRequestId/approve', hasRole('admin', 'moderator'), documentApprovalController.approveDocument);

/**
 * @route   POST /api/document-approval/:approvalRequestId/reject
 * @desc    Reject document
 * @access  Private
 */
router.post('/:approvalRequestId/reject', hasRole('admin', 'moderator'), documentApprovalController.rejectDocument);

/**
 * @route   GET /api/document-approval/:approvalRequestId
 * @desc    Get approval request details
 * @access  Private
 */
router.get('/:approvalRequestId', documentApprovalController.getApprovalRequest);

module.exports = router;
