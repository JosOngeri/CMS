const express = require('express');
const router = express.Router();
const { DocumentsController, upload } = require('../controllers/documents.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Upload documents
router.post('/upload', upload.array('files', 10), DocumentsController.uploadDocuments.bind(DocumentsController));

// Get documents
router.get('/', DocumentsController.getDocuments.bind(DocumentsController));

// Advanced search and filtering
router.get('/search', DocumentsController.advancedSearch.bind(DocumentsController));
router.get('/search/filters', DocumentsController.getSearchFilters.bind(DocumentsController));

// Download document
router.get('/:id/download', DocumentsController.downloadDocument.bind(DocumentsController));

// Update document
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), DocumentsController.updateDocument.bind(DocumentsController));

// Delete document
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), DocumentsController.deleteDocument.bind(DocumentsController));

// Cloud storage
router.post('/cloud-upload', requireRole(['Super Admin', 'Pastor', 'Department Head']), DocumentsController.uploadToCloud.bind(DocumentsController));

// Permissions
router.get('/:documentId/permissions', DocumentsController.getDocumentPermissions.bind(DocumentsController));
router.post('/:documentId/permissions', requireRole(['Super Admin', 'Pastor', 'Department Head']), DocumentsController.setDocumentPermission.bind(DocumentsController));

// Full-text search
router.get('/full-text', DocumentsController.fullTextSearch.bind(DocumentsController));

// Version control
router.get('/:documentId/versions', DocumentsController.getVersionHistory.bind(DocumentsController));
router.post('/:documentId/rollback/:versionId', requireRole(['Super Admin', 'Pastor']), DocumentsController.rollbackToVersion.bind(DocumentsController));

module.exports = router;
