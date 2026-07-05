const BaseRepository = require('./BaseRepository');

/**
 * SMS Provider Repository (Phase 9)
 * Manages SMS provider configurations and balances
 */
class SMSProviderRepository extends BaseRepository {
  constructor() {
    super('sms_providers');
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
    return result.rows;
  }

  /**
   * Get SMS provider by ID
   * @param {string} id - Provider ID
   * @returns {Promise<object>} SMS provider
   */
  async findById(id) {
    const query = `
      SELECT id, name, api_key, api_url, sender_id, balance, currency, is_active, priority, created_at
      FROM sms_providers
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
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
    return result.rows[0] || null;
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

    const result = await this.pool.query(query, [name, api_key, api_url, sender_id, church_id, priority]);
    return result.rows[0];
  }

  /**
   * Update SMS provider
   * @param {string} id - Provider ID
   * @param {object} data - Update data
   * @returns {Promise<object>} Updated provider
   */
  async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.api_key) {
      updates.push(`api_key = $${paramCount++}`);
      values.push(data.api_key);
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
    const query = `
      UPDATE sms_providers
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update provider balance
   * @param {string} id - Provider ID
   * @param {number} balance - New balance
   * @returns {Promise<object>} Updated provider
   */
  async updateBalance(id, balance) {
    const query = `
      UPDATE sms_providers
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [balance, id]);
    return result.rows[0];
  }

  /**
   * Delete SMS provider
   * @param {string} id - Provider ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const query = 'DELETE FROM sms_providers WHERE id = $1';
    const result = await this.pool.query(query, [id]);
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
