const BaseRepository = require('./BaseRepository');

class SmsRepository extends BaseRepository {
  constructor() {
    super('sms_logs');
  }

  async getProviders(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM sms_providers WHERE church_id = $1 AND is_active = true ORDER BY name',
      [churchId]
    );
    return result.rows;
  }

  async getTemplates(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM sms_templates WHERE church_id = $1 AND is_active = true ORDER BY created_at DESC',
      [churchId]
    );
    return result.rows;
  }

  async getCampaigns(churchId) {
    const result = await this.pool.query(
      `SELECT c.*, t.name as template_name,
       (SELECT COUNT(*) FROM sms_logs WHERE campaign_id = c.id) as sent_count,
       (SELECT ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
        FROM sms_logs WHERE campaign_id = c.id) as delivery_rate
       FROM sms_campaigns c
       LEFT JOIN sms_templates t ON c.template_id = t.id
       WHERE c.church_id = $1
       ORDER BY c.created_at DESC`,
      [churchId]
    );
    return result.rows;
  }

  async createProvider(providerData) {
    const { name, api_key, api_url, church_id, is_active } = providerData;
    const query = `
      INSERT INTO sms_providers (name, api_key, api_url, church_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [name, api_key, api_url, church_id, is_active]);
    return result.rows[0];
  }

  async getSMSLogs(filters = {}) {
    let query = `SELECT * FROM sms_logs WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (filters.church_id) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(filters.church_id);
    }

    if (filters.campaign_id) {
      paramCount++;
      query += ` AND campaign_id = $${paramCount}`;
      params.push(filters.campaign_id);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getSMSStats(churchId) {
    const query = `
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as delivery_rate
      FROM sms_logs
      WHERE church_id = $1
    `;
    const result = await this.pool.query(query, [churchId]);
    return result.rows[0];
  }

  async createCampaign(campaignData) {
    const { name, template_id, church_id, scheduled_for, created_by } = campaignData;
    const query = `
      INSERT INTO sms_campaigns (name, template_id, church_id, scheduled_for, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [name, template_id, church_id, scheduled_for, created_by]);
    return result.rows[0];
  }

  async updateCampaignStatus(id, status) {
    const query = `
      UPDATE sms_campaigns
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, id]);
    return result.rows[0];
  }

  async getUserPhones(recipients, recipientIds) {
    // If recipients is an array of phone numbers, return them directly
    if (Array.isArray(recipients) && recipients.length > 0) {
      return recipients;
    }

    // Otherwise, fetch from database by user IDs
    if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      const query = `
        SELECT phone_number FROM users WHERE id = ANY($1) AND phone_number IS NOT NULL
        UNION
        SELECT phone FROM members WHERE user_id = ANY($1) AND phone IS NOT NULL
      `;
      const result = await this.pool.query(query, [recipientIds]);
      return result.rows.map(row => row.phone_number || row.phone);
    }

    return [];
  }

  async getOptedOutMembers(churchId) {
    const query = `
      SELECT phone FROM members
      WHERE church_id = $1 AND sms_opt_out = true AND phone IS NOT NULL
    `;
    const result = await this.pool.query(query, [churchId]);
    return result.rows.map(row => row.phone);
  }

  async filterOptedOutRecipients(recipients, churchId) {
    const optedOutPhones = await this.getOptedOutMembers(churchId);
    return recipients.filter(phone => !optedOutPhones.includes(phone));
  }

  async createSMSLog(sent_by, recipient_count, message, status, schedule_date, schedule_time, template_id, enable_reply, track_links, church_id) {
    const query = `
      INSERT INTO sms_logs (sent_by, recipient_count, message, status, schedule_date, schedule_time, template_id, enable_reply, track_links, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await this.pool.query(query, [sent_by, recipient_count, message, status, schedule_date, schedule_time, template_id, enable_reply, track_links, church_id]);
    return result.rows[0];
  }

  async updateSMSStatus(id, status, deliveryReceipt = null) {
    const query = `
      UPDATE sms_logs
      SET status = $1, delivery_receipt = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, deliveryReceipt, id]);
    return result.rows[0];
  }

  async getPendingSMSLogs(churchId) {
    const query = `
      SELECT * FROM sms_logs
      WHERE church_id = $1 AND status = 'pending'
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async createTemplate(templateData) {
    const { name, content, church_id, created_by } = templateData;
    const query = `
      INSERT INTO sms_templates (name, content, church_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await this.pool.query(query, [name, content, church_id, created_by]);
    return result.rows[0];
  }

  async deleteTemplate(id) {
    const query = 'DELETE FROM sms_templates WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getCampaignsWithStats(churchId) {
    const result = await this.pool.query(
      `SELECT c.*, t.name as template_name,
       (SELECT COUNT(*) FROM sms_logs WHERE campaign_id = c.id) as sent_count,
       (SELECT ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
        FROM sms_logs WHERE campaign_id = c.id) as delivery_rate
       FROM sms_campaigns c
       LEFT JOIN sms_templates t ON c.template_id = t.id
       WHERE c.church_id = $1
       ORDER BY c.created_at DESC`,
      [churchId]
    );
    return result.rows;
  }

  async getAnalyticsWithTopRecipients(churchId, limit = 10) {
    const query = `
      SELECT
        phone_number,
        COUNT(*) as message_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count
      FROM sms_logs
      WHERE church_id = $1
      GROUP BY phone_number
      ORDER BY message_count DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [churchId, limit]);
    return result.rows;
  }

  async getRateLimitStatus(churchId) {
    const query = `
      SELECT
        COUNT(*) as sent_today,
        COALESCE(MAX(rate_limit), 100) as rate_limit
      FROM sms_logs
      WHERE church_id = $1 AND DATE(created_at) = CURRENT_DATE
    `;
    const result = await this.pool.query(query, [churchId]);
    return result.rows[0];
  }

  async getRecentLogsByUser(userId, limit = 20) {
    const query = `
      SELECT * FROM sms_logs
      WHERE sent_by = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows;
  }

  async getTemplateAnalytics(templateId) {
    const query = `
      SELECT
        COUNT(*) as usage_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
      FROM sms_logs
      WHERE template_id = $1
    `;
    const result = await this.pool.query(query, [templateId]);
    return result.rows[0];
  }

  async getTemplateVersions(templateId) {
    const query = `
      SELECT * FROM sms_template_versions
      WHERE template_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [templateId]);
    return result.rows;
  }

  async approveTemplate(id, approvedBy) {
    const query = `
      UPDATE sms_templates
      SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [approvedBy, id]);
    return result.rows[0];
  }

  async rejectTemplate(id, rejectedBy, reason) {
    const query = `
      UPDATE sms_templates
      SET status = 'rejected', rejected_by = $1, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [rejectedBy, reason, id]);
    return result.rows[0];
  }

  async getABTestResults(campaignId) {
    const query = `
      SELECT
        template_id,
        COUNT(*) as sent_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as delivery_rate
      FROM sms_logs
      WHERE campaign_id = $1
      GROUP BY template_id
    `;
    const result = await this.pool.query(query, [campaignId]);
    return result.rows;
  }

  async getCampaignById(id) {
    const query = `
      SELECT c.*, t.name as template_name
      FROM sms_campaigns c
      LEFT JOIN sms_templates t ON c.template_id = t.id
      WHERE c.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getTopContributors(churchId, limit = 10) {
    const query = `
      SELECT
        u.first_name || ' ' || u.last_name as name,
        COUNT(sl.id) as sms_count
      FROM sms_logs sl
      JOIN users u ON sl.sent_by = u.id
      WHERE sl.church_id = $1
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY sms_count DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [churchId, limit]);
    return result.rows;
  }
}

module.exports = new SmsRepository();
