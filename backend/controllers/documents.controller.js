const multer = require('multer');
const path = require('path');
const BaseController = require('./BaseController');
const DocumentsRepository = require('../repositories/DocumentsRepository');
const { createLogger } = require('../helpers/controllerLogger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
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

/**
 * Documents Controller
 * Handles document upload, retrieval, download, and management
 */
class DocumentsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DocumentsController');
  }

  /**
   * Upload documents
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.category] - Document category
   * @param {string} [req.body.tags] - Comma-separated tags
   * @param {string} [req.body.description] - Document description
   * @param {Array} req.files - Uploaded files
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async uploadDocuments(req, res) {
    try {
      const { category, tags, description } = req.body;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }

      const uploadedDocs = [];

      for (const file of files) {
        const document = await DocumentsRepository.createDocument({
          name: file.originalname,
          file_path: file.path,
          size: file.size,
          category,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          description,
          uploaded_by: req.user.id
        });
        uploadedDocs.push(document);
      }

      res.json({
        success: true,
        documents: uploadedDocs
      });
    } catch (error) {
      this.logger.error('uploadDocuments', error);
      res.status(500).json({ success: false, error: 'Failed to upload documents' });
    }
  }

  /**
   * Get documents with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category] - Filter by category
   * @param {string} [req.query.search] - Search in name and description
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDocuments(req, res) {
    try {
      const { category, search } = req.query;
      const churchId = req.user.church_id;

      let documents;
      if (search) {
        documents = await DocumentsRepository.search(search, churchId);
      } else if (category && category !== 'all') {
        documents = await DocumentsRepository.getByCategory(category, churchId);
      } else {
        documents = await DocumentsRepository.getRecent(churchId, 100);
      }

      res.json({ success: true, data: documents });
    } catch (error) {
      this.logger.error('getDocuments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch documents' });
    }
  }

  /**
   * Download a document
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Document ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async downloadDocument(req, res) {
    try {
      const churchId = req.user.church_id;
      const document = await DocumentsRepository.findById(req.params.id, churchId);

      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      res.download(document.file_path, document.name);
    } catch (error) {
      this.logger.error('downloadDocument', error);
      res.status(500).json({ success: false, error: 'Failed to download document' });
    }
  }

  /**
   * Delete a document (soft delete)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Document ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteDocument(req, res) {
    try {
      await DocumentsRepository.softDelete(req.params.id);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('deleteDocument', error);
      res.status(500).json({ success: false, error: 'Failed to delete document' });
    }
  }

  /**
   * Update document metadata
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Document ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.name] - Document name
   * @param {string} [req.body.category] - Document category
   * @param {string} [req.body.tags] - Comma-separated tags
   * @param {string} [req.body.description] - Document description
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateDocument(req, res) {
    try {
      const { name, category, tags, description } = req.body;

      const document = await DocumentsRepository.updateDocument(req.params.id, {
        name,
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        description
      });

      res.json({
        success: true,
        document
      });
    } catch (error) {
      this.logger.error('updateDocument', error);
      res.status(500).json({ success: false, error: 'Failed to update document' });
    }
  }

  /**
   * Advanced document search with full-text search
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.search - Search term
   * @param {string} [req.query.category] - Filter by category
   * @param {string} [req.query.tags] - Filter by tags (comma-separated)
   * @param {string} [req.query.start_date] - Filter by upload date (start)
   * @param {string} [req.query.end_date] - Filter by upload date (end)
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async advancedSearch(req, res) {
    try {
      const { search, category, tags, start_date, end_date, limit = 20, offset = 0 } = req.query;

      if (!search) {
        return res.status(400).json({ success: false, error: 'Search term is required' });
      }

      const documents = await DocumentsRepository.getDocuments({
        search,
        category,
        tags,
        start_date,
        end_date,
        limit,
        offset
      });

      res.json({ success: true, data: documents });
    } catch (error) {
      this.logger.error('advancedSearch', error);
      res.status(500).json({ success: false, error: 'Failed to search documents' });
    }
  }

  /**
   * Get document faceted search filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSearchFilters(req, res) {
    try {
      const churchId = req.user.church_id;

      const [categories, tags, stats] = await Promise.all([
        DocumentsRepository.getCategories(churchId),
        DocumentsRepository.getTags(churchId),
        DocumentsRepository.getDocumentStats(churchId)
      ]);

      res.json({
        success: true,
        data: {
          categories,
          tags,
          stats
        }
      });
    } catch (error) {
      this.logger.error('getSearchFilters', error);
      res.status(500).json({ success: false, error: 'Failed to fetch search filters' });
    }
  }

  /**
   * Get document statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDocumentStats(req, res) {
    try {
      const churchId = req.user.church_id;

      const stats = await DocumentsRepository.getDocumentStats(churchId);

      res.json({ success: true, data: stats });
    } catch (error) {
      this.logger.error('getDocumentStats', error);
      res.status(500).json({ success: false, error: 'Failed to fetch document statistics' });
    }
  }

  /**
   * Upload document to cloud storage
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.file_name - File name
   * @param {string} req.body.file_content - Base64 encoded file content
   * @param {string} req.body.storage_provider - Storage provider (s3, azure, google)
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async uploadToCloud(req, res) {
    try {
      const { file_name, file_content, storage_provider } = req.body;
      const userId = req.user.id;

      // In a real implementation, this would upload to actual cloud storage
      // For now, we'll simulate it and store the reference
      const cloud_url = `https://${storage_provider}.example.com/${file_name}`;
      const storage_key = `${Date.now()}-${file_name}`;

      const document = await DocumentsRepository.uploadToCloud({
        file_name,
        file_url: cloud_url,
        storage_provider,
        storage_key,
        uploaded_by: userId
      });

      res.json({ success: true, data: document });
    } catch (error) {
      this.logger.error('uploadToCloud', error);
      res.status(500).json({ success: false, error: 'Failed to upload to cloud storage' });
    }
  }

  /**
   * Get document permissions
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.documentId - Document ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDocumentPermissions(req, res) {
    try {
      const { documentId } = req.params;

      const permissions = await DocumentsRepository.getDocumentPermissions(documentId);

      res.json({ success: true, data: permissions });
    } catch (error) {
      this.logger.error('getDocumentPermissions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch document permissions' });
    }
  }

  /**
   * Set document permission
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.documentId - Document ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.userId - User ID
   * @param {string} req.body.permission - Permission type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setDocumentPermission(req, res) {
    try {
      const { documentId } = req.params;
      const { userId, permission } = req.body;

      const permissionResult = await DocumentsRepository.setDocumentPermission(documentId, userId, permission);

      res.json({ success: true, data: permissionResult });
    } catch (error) {
      this.logger.error('setDocumentPermission', error);
      res.status(500).json({ success: false, error: 'Failed to set document permission' });
    }
  }

  /**
   * Full-text search documents
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.q - Search query
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async fullTextSearch(req, res) {
    try {
      const { q } = req.query;

      const results = await DocumentsRepository.fullTextSearch(q);

      res.json({ success: true, data: results });
    } catch (error) {
      this.logger.error('fullTextSearch', error);
      res.status(500).json({ success: false, error: 'Failed to perform full-text search' });
    }
  }

  /**
   * Get document version history
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.documentId - Document ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getVersionHistory(req, res) {
    try {
      const { documentId } = req.params;

      const versions = await DocumentsRepository.getVersionHistory(documentId);

      res.json({ success: true, data: versions });
    } catch (error) {
      this.logger.error('getVersionHistory', error);
      res.status(500).json({ success: false, error: 'Failed to fetch version history' });
    }
  }

  /**
   * Rollback document to version
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.documentId - Document ID
   * @param {string} req.params.versionId - Version ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rollbackToVersion(req, res) {
    try {
      const { documentId, versionId } = req.params;
      const userId = req.user.id;

      // Get the version to rollback to
      const version = await DocumentsRepository.getVersionById(versionId, documentId);

      if (!version) {
        return res.status(404).json({ success: false, error: 'Version not found' });
      }

      // Update document with version content
      const document = await DocumentsRepository.updateDocumentContent(documentId, version.file_content, version.file_size, userId);

      // Create new version for the rollback
      await DocumentsRepository.createDocumentVersion(documentId, version.file_content, version.file_size, version.version_number + 1, `Rollback to version ${version.version_number}`, userId);

      res.json({ success: true, data: document });
    } catch (error) {
      this.logger.error('rollbackToVersion', error);
      res.status(500).json({ success: false, error: 'Failed to rollback document' });
    }
  }
}

module.exports = { DocumentsController: new DocumentsController(), upload };
