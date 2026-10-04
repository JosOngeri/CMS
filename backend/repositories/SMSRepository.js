const BaseRepository = require('./BaseRepository');
const smsProviderRepo = require('./SMSProviderRepository');

class SmsRepository extends BaseRepository {
  constructor() {
    super('sms_logs');
  }

  // Provider rows are owned by SMSProviderRepository — it decrypts api_key on
  // read and encrypts on write, so raw queries here would leak ciphertext or
  // store plaintext keys.
  async getProviders(churchId) {
    return smsProviderRepo.getActiveProviders({ church_id: churchId });
  }

  async getTemplates(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM sms_templates WHERE church_id = $1 AND is_active = true ORDER BY created_at DESC',
      [churchId]
    );
    return result.rows;
  }

  // Campaign stats come from one GROUP BY scan over sms_logs joined to the
  // campaign rows — the old code ran 2 correlated subqueries per row.
  async getCampaigns(churchId) {
    const result = await this.pool.query(
      `SELECT c.*, t.name as template_name,
        COALESCE(ls.sent_count, 0) as sent_count,
        COALESCE(ls.delivery_rate, 0) as delivery_rate
       FROM sms_campaigns c
       LEFT JOIN sms_templates t ON c.template_id = t.id
       LEFT JOIN (
         SELECT campaign_id,
                COUNT(*) as sent_count,
                ROUND(COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / NULLIF(COUNT(*), 0), 1) as delivery_rate
         FROM sms_logs
         GROUP BY campaign_id
       ) ls ON ls.campaign_id = c.id
       WHERE c.church_id = $1
       ORDER BY c.created_at DESC`,
      [churchId]
    );
    return result.rows;
  }

  async createProvider(providerData) {
    return smsProviderRepo.create(providerData);
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
    const { name, template_id, church_id, scheduled_for, target_audience, created_by } = campaignData;
    const query = `
      INSERT INTO sms_campaigns (name, template_id, church_id, scheduled_for, target_audience, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [name, template_id, church_id, scheduled_for, JSON.stringify(target_audience || {}), created_by]);
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
      INSERT INTO sms_logs (sent_by, sender_id, user_id, recipient_count, message, status, schedule_date, schedule_time, template_id, enable_reply, track_links, church_id)
      VALUES ($1, $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      sent_by, recipient_count, message, status, schedule_date, schedule_time,
      template_id, enable_reply ?? false, track_links ?? false, church_id,
    ]);
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
    // template_type is NOT NULL in the live schema; callers that don't
    // categorise get 'general'.
    const { name, content, template_type = 'general', church_id, created_by } = templateData;
    const query = `
      INSERT INTO sms_templates (name, content, template_type, church_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [name, content, template_type, church_id, created_by]);
    return result.rows[0];
  }

  async deleteTemplate(id) {
    const query = 'DELETE FROM sms_templates WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getCampaignsWithStats(churchId) {
    // Same consolidated aggregate as getCampaigns — kept for caller compat.
    return this.getCampaigns(churchId);
  }

  async getAnalyticsWithTopRecipients(months, churchId) {
    const since = `NOW() - INTERVAL '${months} months'`;
    const [statsRes, trendsRes, topRes] = await Promise.all([
      this.pool.query(
        `SELECT
           COUNT(*) as total_sent,
           ROUND(COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / NULLIF(COUNT(*), 0), 2) as delivery_rate,
           ROUND(COUNT(*) FILTER (WHERE enable_reply = true) * 100.0 / NULLIF(COUNT(*), 0), 2) as response_rate,
           0 as total_cost
         FROM sms_logs
         WHERE church_id = $1 AND created_at >= ${since}`,
        [churchId]
      ),
      this.pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
           COUNT(*) as sent,
           COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
           COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM sms_logs
         WHERE church_id = $1 AND created_at >= ${since}
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month`,
        [churchId]
      ),
      this.pool.query(
        `SELECT
           COALESCE(phone_number, recipient_phone) as phone_number,
           COUNT(*) as message_count,
           COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count
         FROM sms_logs
         WHERE church_id = $1 AND created_at >= ${since}
           AND COALESCE(phone_number, recipient_phone) IS NOT NULL
         GROUP BY COALESCE(phone_number, recipient_phone)
         ORDER BY message_count DESC
         LIMIT 10`,
        [churchId]
      )
    ]);
    return {
      stats: statsRes.rows[0] || {},
      trends: trendsRes.rows,
      topRecipients: topRes.rows
    };
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

  async getTemplateAnalytics(templateId, churchId) {
    if (!churchId) throw new Error('getTemplateAnalytics: churchId is required');
    // sms_logs has no church_id — scope through the sender's user record
    const query = `
      SELECT
        COUNT(*) as usage_count,
        COUNT(CASE WHEN sl.status = 'delivered' THEN 1 END) as delivered_count,
        ROUND(COUNT(CASE WHEN sl.status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
      FROM sms_logs sl
      WHERE sl.template_id = $1
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = sl.sender_id AND u.church_id = $2)
    `;
    const result = await this.pool.query(query, [templateId, churchId]);
    return result.rows[0];
  }

  async getTemplateVersions(templateId, churchId) {
    if (!churchId) throw new Error('getTemplateVersions: churchId is required');
    // sms_templates is global; scope via the version author's church
    const query = `
      SELECT tv.* FROM sms_template_versions tv
      WHERE tv.template_id = $1
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = tv.created_by AND u.church_id = $2)
      ORDER BY tv.created_at DESC
    `;
    const result = await this.pool.query(query, [templateId, churchId]);
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

  async getCampaignById(id, churchId = null) {
    let query = `
      SELECT c.*, t.name as template_name
      FROM sms_campaigns c
      LEFT JOIN sms_templates t ON c.template_id = t.id
      WHERE c.id = $1
    `;
    const params = [id];
    if (churchId) {
      query += ` AND c.church_id = $2`;
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDailyMessageCounts(days, churchId) {
    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered
      FROM sms_logs
      WHERE church_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    const result = await this.pool.query(query, [churchId, days]);
    return result.rows;
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
