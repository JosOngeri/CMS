const BaseRepository = require('./BaseRepository');

class DocumentVersionsRepository extends BaseRepository {
  constructor() {
    super('document_versions');
  }

  async getVersionsByDocument(documentId, churchId = null) {
    let query = `
      SELECT dv.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM ${this.tableName} dv
      LEFT JOIN users u ON dv.uploaded_by = u.id
      WHERE dv.document_id = $1
    `;
    const params = [documentId];

    if (churchId) {
      query += ` AND dv.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY dv.version_number DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getLatestVersion(documentId, churchId = null) {
    let query = `
      SELECT dv.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM ${this.tableName} dv
      LEFT JOIN users u ON dv.uploaded_by = u.id
      WHERE dv.document_id = $1
    `;
    const params = [documentId];

    if (churchId) {
      query += ` AND dv.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY dv.version_number DESC LIMIT 1`;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getVersionById(versionId, churchId = null) {
    let query = `
      SELECT dv.*, u.first_name || ' ' || u.last_name as uploaded_by_name, d.title as document_title
      FROM ${this.tableName} dv
      LEFT JOIN users u ON dv.uploaded_by = u.id
      LEFT JOIN documents d ON dv.document_id = d.id
      WHERE dv.id = $1
    `;
    const params = [versionId];

    if (churchId) {
      query += ` AND dv.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getVersionCount(documentId, churchId = null) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE document_id = $1`;
    const params = [documentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async restoreVersion(documentId, versionId, userId, churchId = null) {
    let query = `
      UPDATE documents
      SET current_version_id = $1,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    const params = [versionId, userId, documentId];

    if (churchId) {
      query += ` AND church_id = $4`;
      params.push(churchId);
    }

    query += ` RETURNING *`;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDocumentById(documentId, churchId = null) {
    let query = 'SELECT * FROM documents WHERE id = $1';
    const params = [documentId];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createVersion(documentId, filePath, fileSize, uploadedBy, changeSummary, churchId = null) {
    let query = `
      INSERT INTO ${this.tableName} (document_id, file_path, file_size, uploaded_by, change_summary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [documentId, filePath, fileSize, uploadedBy, changeSummary];

    if (churchId) {
      query = `
        INSERT INTO ${this.tableName} (document_id, file_path, file_size, uploaded_by, change_summary, church_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateDocumentFilePath(documentId, filePath, churchId = null) {
    let query = 'UPDATE documents SET file_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    const params = [filePath, documentId];

    if (churchId) {
      query += ' AND church_id = $3';
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getVersionByIdAndDocumentId(versionId, documentId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND document_id = $2`;
    const params = [versionId, documentId];

    if (churchId) {
      query += ' AND church_id = $3';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createRollbackVersion(documentId, filePath, fileSize, uploadedBy, changeSummary, rollbackFromId, churchId = null) {
    let query = `
      INSERT INTO ${this.tableName} (document_id, file_path, file_size, uploaded_by, change_summary, rollback_from_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [documentId, filePath, fileSize, uploadedBy, changeSummary, rollbackFromId];

    if (churchId) {
      query = `
        INSERT INTO ${this.tableName} (document_id, file_path, file_size, uploaded_by, change_summary, rollback_from_id, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDocumentTitle(documentId, churchId = null) {
    let query = 'SELECT title FROM documents WHERE id = $1';
    const params = [documentId];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0]?.title || 'document';
  }

  async getDocumentFilePath(documentId, churchId = null) {
    let query = 'SELECT file_path FROM documents WHERE id = $1';
    const params = [documentId];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0]?.file_path;
  }

  async getDocumentPermissions(documentId, churchId = null) {
    let query = `
      SELECT dp.*,
             u.first_name || ' ' || u.last_name as user_name,
             d.name as department_name,
             ub.first_name || ' ' || ub.last_name as granted_by_name
      FROM document_permissions dp
      LEFT JOIN users u ON dp.user_id = u.id
      LEFT JOIN departments d ON dp.department_id = d.id
      LEFT JOIN users ub ON dp.granted_by = ub.id
      WHERE dp.document_id = $1
    `;
    const params = [documentId];

    if (churchId) {
      query += ' AND dp.church_id = $2';
      params.push(churchId);
    }

    query += ' ORDER BY dp.granted_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async grantDocumentPermission(documentId, userId, departmentId, permissionLevel, grantedBy, churchId = null) {
    let query = `
      INSERT INTO document_permissions (document_id, user_id, department_id, permission_level, granted_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (document_id, user_id) DO UPDATE SET
        permission_level = EXCLUDED.permission_level,
        granted_by = EXCLUDED.granted_by,
        granted_at = CURRENT_TIMESTAMP
      ON CONFLICT (document_id, department_id) DO UPDATE SET
        permission_level = EXCLUDED.permission_level,
        granted_by = EXCLUDED.granted_by,
        granted_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const params = [documentId, userId || null, departmentId || null, permissionLevel || 'view', grantedBy];

    if (churchId) {
      query = `
        INSERT INTO document_permissions (document_id, user_id, department_id, permission_level, granted_by, church_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (document_id, user_id) DO UPDATE SET
          permission_level = EXCLUDED.permission_level,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
        ON CONFLICT (document_id, department_id) DO UPDATE SET
          permission_level = EXCLUDED.permission_level,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async revokeDocumentPermission(permissionId, documentId, churchId = null) {
    let query = 'DELETE FROM document_permissions WHERE id = $1 AND document_id = $2';
    const params = [permissionId, documentId];

    if (churchId) {
      query += ' AND church_id = $3';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount > 0;
  }

  async getAccessLogs(documentId, limit = 50, offset = 0, churchId = null) {
    let query = `
      SELECT dal.*,
             u.first_name || ' ' || u.last_name as user_name
      FROM document_access_logs dal
      LEFT JOIN users u ON dal.user_id = u.id
      WHERE dal.document_id = $1
    `;
    const params = [documentId];

    if (churchId) {
      query += ' AND dal.church_id = $2';
      params.push(churchId);
    }

    query += ' ORDER BY dal.accessed_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async deleteVersion(versionId) {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [versionId]
    );
    return result.rowCount > 0;
  }
}

module.exports = new DocumentVersionsRepository();
