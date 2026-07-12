const BaseController = require('./BaseController');
const DocumentVersionsRepository = require('../repositories/DocumentVersionsRepository');
const { createLogger } = require('../helpers/controllerLogger');
const fs = require('fs');
const path = require('path');

/**
 * Document Versions Controller
 * Handles document version control and management
 */
class DocumentVersionsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DocumentVersionsController');
  }

  /**
   * Get all versions of a document
   */
  async getDocumentVersions(req, res) {
    try {
      const { documentId } = req.params;
      const churchId = req.user.church_id;

      const versions = await DocumentVersionsRepository.getVersionsByDocument(documentId, churchId);

      this.success(res, { data: versions });
    } catch (error) {
      this.logger.error('getDocumentVersions', error);
      this.error(res, 'Failed to fetch document versions');
    }
  }

  /**
   * Get specific version by ID
   */
  async getVersionById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const version = await DocumentVersionsRepository.getVersionById(id, churchId);

      if (!version) {
        return this.notFound(res, 'Document version not found');
      }

      this.success(res, { data: version });
    } catch (error) {
      this.logger.error('getVersionById', error);
      this.error(res, 'Failed to fetch document version');
    }
  }

  /**
   * Upload new document version
   */
  async uploadDocumentVersion(req, res) {
    try {
      const { documentId } = req.params;
      const { change_summary } = req.body;
      const file = req.file;
      const churchId = req.user.church_id;

      if (!file) {
        return this.badRequest(res, 'No file uploaded');
      }

      const document = await DocumentVersionsRepository.getDocumentById(documentId, churchId);

      if (!document) {
        return this.notFound(res, 'Document not found');
      }

      const version = await DocumentVersionsRepository.createVersion(
        documentId,
        file.path,
        file.size,
        req.user.id,
        change_summary,
        churchId
      );

      await DocumentVersionsRepository.updateDocumentFilePath(documentId, file.path, churchId);

      this.created(res, { data: version });
    } catch (error) {
      this.logger.error('uploadDocumentVersion', error);
      this.error(res, 'Failed to upload document version');
    }
  }

  /**
   * Rollback to specific version
   */
  async rollbackToVersion(req, res) {
    try {
      const { documentId, versionId } = req.params;
      const churchId = req.user.church_id;

      const version = await DocumentVersionsRepository.getVersionByIdAndDocumentId(versionId, documentId, churchId);

      if (!version) {
        return this.notFound(res, 'Version not found');
      }

      const newVersion = await DocumentVersionsRepository.createRollbackVersion(
        documentId,
        version.file_path,
        version.file_size,
        req.user.id,
        `Rollback to version ${version.version_number}`,
        versionId,
        churchId
      );

      await DocumentVersionsRepository.updateDocumentFilePath(documentId, version.file_path, churchId);

      this.success(res, { message: 'Document rolled back successfully', data: newVersion });
    } catch (error) {
      this.logger.error('rollbackToVersion', error);
      this.error(res, 'Failed to rollback document');
    }
  }

  /**
   * Download specific version
   */
  async downloadVersion(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const version = await DocumentVersionsRepository.getVersionById(id, churchId);

      if (!version) {
        return this.notFound(res, 'Document version not found');
      }

      if (!fs.existsSync(version.file_path)) {
        return this.notFound(res, 'File not found');
      }

      const documentTitle = await DocumentVersionsRepository.getDocumentTitle(version.document_id, churchId);
      const filename = `${documentTitle}_v${version.version_number}${path.extname(version.file_path)}`;

      res.download(version.file_path, filename);
    } catch (error) {
      this.logger.error('downloadVersion', error);
      this.error(res, 'Failed to download version');
    }
  }

  /**
   * Delete version (only if not current)
   */
  async deleteVersion(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const version = await DocumentVersionsRepository.getVersionById(id, churchId);

      if (!version) {
        return this.notFound(res, 'Version not found');
      }

      const currentFilePath = await DocumentVersionsRepository.getDocumentFilePath(version.document_id, churchId);

      if (currentFilePath === version.file_path) {
        return this.badRequest(res, 'Cannot delete current version. Rollback to another version first.');
      }

      if (fs.existsSync(version.file_path)) {
        fs.unlinkSync(version.file_path);
      }

      await DocumentVersionsRepository.deleteVersion(id);

      this.success(res, { message: 'Version deleted successfully' });
    } catch (error) {
      this.logger.error('deleteVersion', error);
      this.error(res, 'Failed to delete version');
    }
  }

  /**
   * Get document permissions
   */
  async getDocumentPermissions(req, res) {
    try {
      const { documentId } = req.params;
      const churchId = req.user.church_id;

      const permissions = await DocumentVersionsRepository.getDocumentPermissions(documentId, churchId);

      this.success(res, { data: permissions });
    } catch (error) {
      this.logger.error('getDocumentPermissions', error);
      this.error(res, 'Failed to fetch document permissions');
    }
  }

  /**
   * Grant document permission
   */
  async grantDocumentPermission(req, res) {
    try {
      const { documentId } = req.params;
      const { user_id, department_id, permission_level } = req.body;
      const churchId = req.user.church_id;

      if (!user_id && !department_id) {
        return this.badRequest(res, 'Either user_id or department_id must be provided');
      }

      const permission = await DocumentVersionsRepository.grantDocumentPermission(
        documentId,
        user_id,
        department_id,
        permission_level,
        req.user.id,
        churchId
      );

      this.created(res, { data: permission });
    } catch (error) {
      this.logger.error('grantDocumentPermission', error);
      this.error(res, 'Failed to grant permission');
    }
  }

  /**
   * Revoke document permission
   */
  async revokeDocumentPermission(req, res) {
    try {
      const { documentId, permissionId } = req.params;
      const churchId = req.user.church_id;

      await DocumentVersionsRepository.revokeDocumentPermission(permissionId, documentId, churchId);

      this.success(res, { message: 'Permission revoked successfully' });
    } catch (error) {
      this.logger.error('revokeDocumentPermission', error);
      this.error(res, 'Failed to revoke permission');
    }
  }

  /**
   * Get document access logs
   */
  async getAccessLogs(req, res) {
    try {
      const { documentId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const churchId = req.user.church_id;

      const logs = await DocumentVersionsRepository.getAccessLogs(documentId, limit, offset, churchId);

      this.success(res, { data: logs });
    } catch (error) {
      this.logger.error('getAccessLogs', error);
      this.error(res, 'Failed to fetch access logs');
    }
  }
}

module.exports = new DocumentVersionsController();
