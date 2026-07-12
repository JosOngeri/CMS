const BaseRepository = require('./BaseRepository');

class DocumentsRepository extends BaseRepository {
  constructor() {
    super('documents');
  }

  async getRecent(churchId = null, limit = 20) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByCategory(category, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE category = $1`;
    const params = [category];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async search(searchTerm, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE (name ILIKE $1 OR description ILIKE $1)`;
    const params = [`%${searchTerm}%`];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithUploaderDetails(documentId, churchId = null) {
    let query = `
      SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1
    `;
    const params = [documentId];

    if (churchId) {
      query += ` AND d.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findById(id, churchId = null) {
    let query = 'SELECT * FROM documents WHERE id = $1';
    const params = [id];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDocumentStats(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(CASE WHEN category = 'policies' THEN 1 END) as policies_count,
        COUNT(CASE WHEN category = 'forms' THEN 1 END) as forms_count,
        COUNT(CASE WHEN category = 'reports' THEN 1 END) as reports_count,
        COUNT(CASE WHEN category = 'minutes' THEN 1 END) as minutes_count
      FROM documents
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getCategories(churchId = null) {
    let query = `SELECT DISTINCT category FROM documents WHERE category IS NOT NULL`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY category`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => row.category);
  }

  async getTags(churchId = null) {
    let query = `SELECT DISTINCT unnest(string_to_array(tags, ',')) as tag FROM documents WHERE tags IS NOT NULL AND tags != ''`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY tag`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => row.tag);
  }

  async createDocument(data) {
    const { name, file_path, size, category, tags, description, uploaded_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO documents (name, file_path, size, category, tags, description, uploaded_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, file_path, size, category, tags, description, uploaded_by, church_id]
    );
    return result.rows[0];
  }

  async softDelete(id, churchId = null) {
    let query = 'UPDATE documents SET is_active = false WHERE id = $1';
    const params = [id];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount > 0;
  }

  async updateDocument(id, data, churchId = null) {
    const { name, category, tags, description } = data;

    let query = `UPDATE documents
       SET name = $1, category = $2, tags = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`;
    const params = [name, category, tags, description, id];

    if (churchId) {
      query += ' AND church_id = $6';
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDocuments(filters = {}) {
    const { category, tags, search, start_date, end_date, limit = 50, offset = 0, churchId } = filters;

    let query = `SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
                 FROM documents d
                 LEFT JOIN users u ON d.uploaded_by = u.id
                 WHERE d.is_active = true`;
    const params = [];
    let paramCount = 1;

    if (churchId) {
      query += ` AND d.church_id = $${paramCount++}`;
      params.push(churchId);
    }

    if (category) {
      query += ` AND d.category = $${paramCount++}`;
      params.push(category);
    }

    if (tags) {
      query += ` AND d.tags LIKE $${paramCount++}`;
      params.push(`%${tags}%`);
    }

    if (search) {
      query += ` AND (d.name ILIKE $${paramCount++} OR d.description ILIKE $${paramCount++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (start_date) {
      query += ` AND d.created_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND d.created_at <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async uploadToCloud(data) {
    const { file_name, file_url, storage_provider, storage_key, uploaded_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO documents (file_name, file_url, storage_provider, storage_key, uploaded_by, cloud_storage, church_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING *`,
      [file_name, file_url, storage_provider, storage_key, uploaded_by, church_id]
    );
    return result.rows[0];
  }

  async getDocumentPermissions(documentId, churchId = null) {
    let query = `SELECT dp.*, u.first_name || ' ' || u.last_name as user_name
       FROM document_permissions dp
       LEFT JOIN users u ON dp.user_id = u.id
       WHERE dp.document_id = $1`;
    const params = [documentId];

    if (churchId) {
      query += ` AND dp.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async setDocumentPermission(documentId, userId, permission, churchId = null) {
    const result = await this.pool.query(
      `INSERT INTO document_permissions (document_id, user_id, permission, church_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (document_id, user_id)
       DO UPDATE SET permission = $3
       RETURNING *`,
      [documentId, userId, permission, churchId]
    );
    return result.rows[0];
  }

  async fullTextSearch(query, churchId = null) {
    let sql = `SELECT d.*,
              ts_rank(to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.content, '')), plainto_tsquery('english', $1)) as rank
       FROM documents d
       WHERE to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.content, '')) @@ plainto_tsquery('english', $1)`;
    const params = [query];

    if (churchId) {
      sql += ' AND d.church_id = $2';
      params.push(churchId);
    }

    sql += ' ORDER BY rank DESC LIMIT 50';

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async getVersionHistory(documentId) {
    const query = `SELECT dv.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM document_versions dv
       LEFT JOIN users u ON dv.uploaded_by = u.id
       WHERE dv.document_id = $1
       ORDER BY dv.created_at DESC`;

    const result = await this.pool.query(query, [documentId]);
    return result.rows;
  }

  async getLastVersionNumber(documentId) {
    const query = `SELECT COALESCE(MAX(version_number), 0) as last_version
       FROM document_versions
       WHERE document_id = $1`;
    const result = await this.pool.query(query, [documentId]);
    return result.rows[0]?.last_version || 0;
  }

  async getVersionById(versionId, documentId) {
    const query = 'SELECT * FROM document_versions WHERE id = $1 AND document_id = $2';
    const result = await this.pool.query(query, [versionId, documentId]);
    return result.rows[0];
  }

  async updateDocumentContent(documentId, filePath, fileSize, updatedBy, churchId = null) {
    let query = `UPDATE documents
       SET file_path = $1, size = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`;
    const params = [filePath, fileSize, updatedBy, documentId];

    if (churchId) {
      query += ' AND church_id = $5';
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createDocumentVersion(documentId, fileContent, fileSize, versionNumber, changeSummary, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO document_versions (document_id, file_path, file_size, version_number, change_summary, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [documentId, fileContent, fileSize, versionNumber, changeSummary, createdBy]
    );
    return result.rows[0];
  }

  async updateApprovalStatus(documentId, status, approvedBy, churchId = null) {
    let query = `UPDATE documents
       SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
       WHERE id = $3`;
    const params = [status, approvedBy, documentId];

    if (churchId) {
      query += ' AND church_id = $4';
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new DocumentsRepository();
