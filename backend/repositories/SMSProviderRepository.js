const BaseRepository = require('./BaseRepository');
const AuditLogRepository = require('./AuditLogRepository');
const { encrypt, decrypt } = require('../utils/secretBox');

/**
 * SMS Provider Repository (Phase 9)
 * Manages SMS provider configurations and balances.
 * L780: api_key is encrypted at rest (enc:v1: AES-256-GCM); reads decrypt so
 * callers see plaintext exactly as before. Legacy plaintext rows still work.
 */
class SMSProviderRepository extends BaseRepository {
  constructor() {
    super('sms_providers');
  }

  _decryptRow(row) {
    if (row && row.api_key) row.api_key = decrypt(row.api_key);
    return row;
  }

  _decryptRows(rows) {
    return rows.map((r) => this._decryptRow(r));
  }

  /**
   * Get all active SMS providers
   * @param {object} filters - Filter options
   * @returns {Promise<object[]>} SMS providers
   */
  async getActiveProviders(filters = {}) {
    const conditions = ['is_active = true'];
    const params = [];
    let paramCount = 1;

    if (filters.church_id) {
      conditions.push(`church_id = $${paramCount++}`);
      params.push(filters.church_id);
    }

    const query = `
      SELECT id, name, api_key, api_url, sender_id, balance, currency, is_active, priority, created_at
      FROM sms_providers
      WHERE ${conditions.join(' AND ')}
      ORDER BY priority ASC
    `;

    const result = await this.pool.query(query, params);
    return this._decryptRows(result.rows);
  }

  /**
   * Get SMS provider by ID
   * @param {string} id - Provider ID
   * @returns {Promise<object>} SMS provider
   */
  async findById(id, churchId = null) {
    let query = `
      SELECT id, name, api_key, api_url, sender_id, balance, currency, is_active, priority, created_at
      FROM sms_providers
      WHERE id = $1
    `;
    const params = [id];
    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return this._decryptRow(result.rows[0] || null);
  }

  /**
   * Get SMS provider by name
   * @param {string} name - Provider name
   * @returns {Promise<object>} SMS provider
   */
  async findByName(name) {
    const query = `
      SELECT id, name, api_key, api_url, sender_id, balance, currency, is_active, priority, created_at
      FROM sms_providers
      WHERE name = $1
    `;
    const result = await this.pool.query(query, [name]);
    return this._decryptRow(result.rows[0] || null);
  }

  /**
   * Create new SMS provider
   * @param {object} data - Provider data
   * @returns {Promise<object>} Created provider
   */
  async create(data) {
    const { name, api_key, api_url, sender_id, church_id, priority = 10 } = data;

    const query = `
      INSERT INTO sms_providers (name, api_key, api_url, sender_id, church_id, priority, balance, currency, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'KES', true)
      RETURNING *
    `;

    const result = await this.pool.query(query, [name, encrypt(api_key), api_url, sender_id, church_id, priority]);
    return this._decryptRow(result.rows[0]);
  }

  /**
   * Update SMS provider
   * @param {string} id - Provider ID
   * @param {object} data - Update data
   * @returns {Promise<object>} Updated provider
   */
  async update(id, data, churchId = null, actorId = null) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.api_key) {
      updates.push(`api_key = $${paramCount++}`);
      values.push(encrypt(data.api_key));
    }
    if (data.api_url) {
      updates.push(`api_url = $${paramCount++}`);
      values.push(data.api_url);
    }
    if (data.sender_id) {
      updates.push(`sender_id = $${paramCount++}`);
      values.push(data.sender_id);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(data.priority);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    let whereClause = `id = $${paramCount++}`;
    if (churchId) {
      whereClause += ` AND church_id = $${paramCount}`;
      values.push(churchId);
    }
    const query = `
      UPDATE sms_providers
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    // api_key rotations are security-sensitive — write an audit trail entry.
    // Never log the key itself, just the fact that it changed.
    if (row && data.api_key) {
      try {
        await AuditLogRepository.create({
          action: 'SMS_PROVIDER_API_KEY_UPDATED',
          entity_type: 'sms_provider',
          entity_id: id,
          user_id: actorId,
          church_id: churchId || row.church_id,
          details: { provider_name: row.name }
        });
      } catch (auditErr) {
        // Audit failure must not roll back the provider update.
      }
    }

    return this._decryptRow(row);
  }

  /**
   * Update provider balance
   * @param {string} id - Provider ID
   * @param {number} balance - New balance
   * @returns {Promise<object>} Updated provider
   */
  async updateBalance(id, balance, churchId = null) {
    let query = `
      UPDATE sms_providers
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    const params = [balance, id];
    if (churchId) {
      query += ` AND church_id = $3`;
      params.push(churchId);
    }
    query += ` RETURNING *`;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete SMS provider
   * @param {string} id - Provider ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id, churchId = null) {
    let query = 'DELETE FROM sms_providers WHERE id = $1';
    const params = [id];
    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Get provider delivery statistics
   * @param {string} providerId - Provider ID
   * @param {object} filters - Date filters
   * @returns {Promise<object>} Delivery statistics
   */
  async getDeliveryStats(providerId, filters = {}) {
    const conditions = ['provider_id = $1'];
    const params = [providerId];
    let paramCount = 2;

    if (filters.start_date) {
      conditions.push(`created_at >= $${paramCount++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`created_at <= $${paramCount++}`);
      params.push(filters.end_date);
    }

    const query = `
      SELECT
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM sms_logs
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new SMSProviderRepository();
