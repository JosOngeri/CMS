const express = require('express');
const router = express.Router();
const documentVersionsController = require('../controllers/documentVersions.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/versions/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Document Versions
router.get('/:documentId/versions', documentVersionsController.getDocumentVersions);
router.get('/versions/:id', documentVersionsController.getVersionById);
router.post('/:documentId/versions', upload.single('file'), documentVersionsController.uploadDocumentVersion);
router.post('/:documentId/rollback/:versionId', requireRole(['Super Admin', 'Pastor', 'Department Head']), documentVersionsController.rollbackToVersion);
router.get('/versions/:id/download', documentVersionsController.downloadVersion);
router.delete('/versions/:id', requireRole(['Super Admin', 'Pastor']), documentVersionsController.deleteVersion);

// Document Permissions
router.get('/:documentId/permissions', documentVersionsController.getDocumentPermissions);
router.post('/:documentId/permissions', documentVersionsController.grantDocumentPermission);
router.delete('/:documentId/permissions/:permissionId', requireRole(['Super Admin', 'Pastor', 'Department Head']), documentVersionsController.revokeDocumentPermission);

// Access Logs
router.get('/:documentId/access-logs', documentVersionsController.getAccessLogs);

module.exports = router;
