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

  async findById(id) {
    const result = await this.pool.query('SELECT * FROM documents WHERE id = $1', [id]);
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
    const { name, file_path, size, category, tags, description, uploaded_by } = data;

    const result = await this.pool.query(
      `INSERT INTO documents (name, file_path, size, category, tags, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, file_path, size, category, tags, description, uploaded_by]
    );
    return result.rows[0];
  }

  async softDelete(id) {
    const result = await this.pool.query(
      'UPDATE documents SET is_active = false WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async updateDocument(id, data) {
    const { name, category, tags, description } = data;

    const result = await this.pool.query(
      `UPDATE documents
       SET name = $1, category = $2, tags = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, category, tags, description, id]
    );
    return result.rows[0];
  }

  async getDocuments(filters = {}) {
    const { category, tags, search, start_date, end_date, limit = 50, offset = 0 } = filters;

    let query = `SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
                 FROM documents d
                 LEFT JOIN users u ON d.uploaded_by = u.id
                 WHERE d.is_active = true`;
    const params = [];
    let paramCount = 1;

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
    const { file_name, file_url, storage_provider, storage_key, uploaded_by } = data;

    const result = await this.pool.query(
      `INSERT INTO documents (file_name, file_url, storage_provider, storage_key, uploaded_by, cloud_storage)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [file_name, file_url, storage_provider, storage_key, uploaded_by]
    );
    return result.rows[0];
  }

  async getDocumentPermissions(documentId) {
    const result = await this.pool.query(
      `SELECT dp.*, u.first_name || ' ' || u.last_name as user_name
       FROM document_permissions dp
       LEFT JOIN users u ON dp.user_id = u.id
       WHERE dp.document_id = $1`,
      [documentId]
    );
    return result.rows;
  }

  async setDocumentPermission(documentId, userId, permission) {
    const result = await this.pool.query(
      `INSERT INTO document_permissions (document_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, user_id)
       DO UPDATE SET permission = $3
       RETURNING *`,
      [documentId, userId, permission]
    );
    return result.rows[0];
  }

  async fullTextSearch(query) {
    const result = await this.pool.query(
      `SELECT d.*,
              ts_rank(d.search_vector, plainto_tsquery('english', $1)) as rank
       FROM documents d
       WHERE d.search_vector @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT 50`,
      [query]
    );
    return result.rows;
  }

  async getVersionHistory(documentId) {
    const result = await this.pool.query(
      `SELECT dv.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM document_versions dv
       LEFT JOIN users u ON dv.created_by = u.id
       WHERE dv.document_id = $1
       ORDER BY dv.created_at DESC`,
      [documentId]
    );
    return result.rows;
  }

  async getVersionById(versionId, documentId) {
    const result = await this.pool.query(
      'SELECT * FROM document_versions WHERE id = $1 AND document_id = $2',
      [versionId, documentId]
    );
    return result.rows[0];
  }

  async updateDocumentContent(documentId, fileContent, fileSize, updatedBy) {
    const result = await this.pool.query(
      `UPDATE documents
       SET file_content = $1, file_size = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [fileContent, fileSize, updatedBy, documentId]
    );
    return result.rows[0];
  }

  async createDocumentVersion(documentId, fileContent, fileSize, versionNumber, changeSummary, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO document_versions (document_id, file_content, file_size, version_number, change_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [documentId, fileContent, fileSize, versionNumber, changeSummary, createdBy]
    );
    return result.rows[0];
  }
}

module.exports = new DocumentsRepository();
