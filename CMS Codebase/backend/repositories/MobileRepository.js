const BaseRepository = require('./BaseRepository');

class MobileRepository extends BaseRepository {
  constructor() {
    super('mobile');
  }

  async getUnreadNotificationsCount(userId, churchId = null) {
    let query = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getPendingApprovalsCount(userId, churchId = null) {
    let query = `SELECT COUNT(*) as count FROM approval_requests WHERE status = $1 AND requester_id = $2`;
    const params = ['pending', userId];

    if (churchId) {
      query += ` AND church_id = $3`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getQuickStats(churchId = null) {
    let query = `
      SELECT
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM departments WHERE is_active = true) as total_departments,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_income,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_expense
    `;
    const params = [];

    if (churchId) {
      query = `
        SELECT
          (SELECT COUNT(*) FROM members WHERE church_id = $1) as total_members,
          (SELECT COUNT(*) FROM departments WHERE is_active = true AND church_id = $1) as total_departments,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as monthly_income,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as monthly_expense
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getRecentActivity(userId, limit = 10, churchId = null) {
    let query = `
      SELECT
        a.id,
        a.activity_type,
        a.description,
        a.created_at,
        a.metadata
      FROM activities a
      WHERE a.user_id = $1
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND a.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getMobileContent(churchId) {
    const result = await this.pool.query(
      `SELECT id, title, slug, content_type, status, published_at
       FROM content_items
       WHERE church_id = $1
       AND status = 'published'
       ORDER BY published_at DESC
       LIMIT 20`,
      [churchId]
    );
    return result.rows;
  }

  async getMobileAnnouncements(churchId) {
    const result = await this.pool.query(
      `SELECT id, title, content, priority, created_at
       FROM announcements
       WHERE church_id = $1
       AND is_published = true
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY priority DESC, created_at DESC
       LIMIT 10`,
      [churchId]
    );
    return result.rows;
  }

  async getMobileDepartments(churchId) {
    const result = await this.pool.query(
      `SELECT id, name, description, category
       FROM departments
       WHERE church_id = $1
       AND is_active = true
       ORDER BY name`,
      [churchId]
    );
    return result.rows;
  }

  async checkEventsTable() {
    const result = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'events'
      ) as exists
    `);
    return result.rows[0].exists;
  }

  async getMobileEvents(churchId) {
    const query = `
      SELECT id, title, description, event_date, event_time, location
      FROM events
      WHERE church_id = $1
      AND event_date >= CURRENT_DATE
    `;
    const params = [churchId];

    query += ' ORDER BY event_date ASC, event_time ASC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getSyncData(syncDate, churchId) {
    const [updatedContent, updatedAnnouncements, updatedEvents, updatedDepartments] = await Promise.all([
      this.pool.query('SELECT * FROM content_items WHERE updated_at > $1 AND church_id = $2', [syncDate, churchId]),
      this.pool.query('SELECT * FROM announcements WHERE updated_at > $1 AND church_id = $2', [syncDate, churchId]).catch(() => ({ rows: [] })),
      this.pool.query('SELECT * FROM events WHERE updated_at > $1 AND church_id = $2', [syncDate, churchId]).catch(() => ({ rows: [] })),
      this.pool.query('SELECT * FROM departments WHERE updated_at > $1 AND church_id = $2', [syncDate, churchId])
    ]);

    return {
      content: updatedContent.rows,
      announcements: updatedAnnouncements.rows,
      events: updatedEvents.rows,
      departments: updatedDepartments.rows
    };
  }

  // ==================== SMS INTEGRATION METHODS ====================

  async getDeltaContacts(syncDate, churchId) {
    const query = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        department_id,
        updated_at,
        created_at
      FROM members
      WHERE updated_at > $1
      AND is_active = true
      ORDER BY updated_at ASC
    `;
    const result = await this.pool.query(query, [syncDate]);
    return result.rows;
  }

  async processContactChanges(changes, churchId, userId) {
    const processed = [];
    const conflicts = [];
    const errors = [];

    for (const change of changes) {
      try {
        if (change.action === 'create' || change.action === 'update') {
          const existingMember = await this.pool.query(
            'SELECT * FROM members WHERE id = $1 AND church_id = $2',
            [change.id, churchId]
          );

          if (existingMember.rows.length > 0) {
            // Check for conflicts
            if (new Date(existingMember.rows[0].updated_at) > new Date(change.updatedAt)) {
              conflicts.push({
                id: change.id,
                reason: 'CMS version is newer',
                localVersion: change.updatedAt,
                cmsVersion: existingMember.rows[0].updated_at
              });
              continue;
            }

            // Update existing
            await this.pool.query(
              `UPDATE members SET
                first_name = $1,
                last_name = $2,
                email = $3,
                phone = $4,
                updated_at = $5,
                last_synced_by = $6
              WHERE id = $7 AND church_id = $8`,
              [change.firstName, change.lastName, change.email, change.phone, change.updatedAt, userId, change.id, churchId]
            );
            processed.push(change.id);
          } else {
            // Create new
            await this.pool.query(
              `INSERT INTO members (id, first_name, last_name, email, phone, church_id, created_at, updated_at, is_active, last_synced_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
              [change.id, change.firstName, change.lastName, change.email, change.phone, churchId, change.createdAt, change.updatedAt, userId]
            );
            processed.push(change.id);
          }
        } else if (change.action === 'delete') {
          await this.pool.query(
            'UPDATE members SET is_active = false, last_synced_by = $1 WHERE id = $2 AND church_id = $3',
            [userId, change.id, churchId]
          );
          processed.push(change.id);
        }
      } catch (error) {
        errors.push({
          id: change.id,
          error: error.message
        });
      }
    }

    return { processed, conflicts, errors };
  }

  async getDeltaTemplates(syncDate, churchId) {
    const query = `
      SELECT
        id,
        name,
        content,
        category,
        is_official,
        usage_count,
        last_used,
        updated_at,
        created_at
      FROM sms_templates
      WHERE updated_at > $1
      AND is_official = true
      ORDER BY updated_at ASC
    `;
    const result = await this.pool.query(query, [syncDate]);
    return result.rows;
  }

  async processTemplateAnalytics(analytics, churchId) {
    let processed = 0;

    for (const analytic of analytics) {
      try {
        await this.pool.query(
          `UPDATE sms_templates SET
            usage_count = usage_count + $1,
            last_used = $2
          WHERE id = $3`,
          [analytic.usageCount || 1, analytic.lastUsed || new Date(), analytic.templateId]
        );
        processed++;
      } catch (error) {
        console.error('Error processing template analytics:', error);
      }
    }

    return { processed };
  }

  async getOfficialTemplates(churchId) {
    const query = `
      SELECT
        id,
        name,
        content,
        category,
        usage_count,
        last_used,
        updated_at
      FROM sms_templates
      WHERE is_official = true
      AND is_active = true
      ORDER BY category, name
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async processSmsLogs(logs, churchId, userId) {
    const processed = [];
    const errors = [];

    for (const log of logs) {
      try {
        await this.pool.query(
          `INSERT INTO sms_logs (
            id, user_id, recipient_count, message, status,
            sent_at, created_at, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            log.id,
            userId,
            log.recipientCount,
            log.message,
            log.status,
            log.sentAt || new Date(),
            log.createdAt || new Date(),
            'mobile'
          ]
        );
        processed.push(log.id);
      } catch (error) {
        errors.push({
          id: log.id,
          error: error.message
        });
      }
    }

    return { processed, errors };
  }

  async getSmsLogs(syncDate, churchId, limit) {
    const query = `
      SELECT
        id,
        recipient_count,
        message,
        status,
        sent_at,
        created_at
      FROM sms_logs
      WHERE created_at > $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [syncDate, limit]);
    return result.rows;
  }

  async getPendingSmsLogs(churchId, userId) {
    const query = `
      SELECT
        id,
        recipient_count,
        message,
        status,
        created_at
      FROM sms_logs
      WHERE user_id = $1
      AND status = 'pending'
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async createMobileCampaign(campaignData) {
    const { name, templateId, scheduledDate, targetAudience, churchId, userId, source } = campaignData;

    const query = `
      INSERT INTO sms_campaigns (
        name, template_id, scheduled_date, target_audience,
        created_by, status, source, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      name,
      templateId,
      scheduledDate,
      JSON.stringify(targetAudience),
      userId,
      source,
      new Date()
    ]);

    return result.rows[0];
  }

  async getCampaignProgress(campaignId, churchId) {
    const query = `
      SELECT
        c.id,
        c.name,
        c.status,
        c.scheduled_date,
        c.total_recipients,
        c.sent_recipients,
        c.failed_recipients,
        c.created_at,
        (
          SELECT COUNT(*) FROM sms_logs
          WHERE campaign_id = c.id
          AND status = 'sent'
        ) as sent_count,
        (
          SELECT COUNT(*) FROM sms_logs
          WHERE campaign_id = c.id
          AND status = 'failed'
        ) as failed_count
      FROM sms_campaigns c
      WHERE c.id = $1
    `;

    const result = await this.pool.query(query, [campaignId]);
    return result.rows[0];
  }

  async getMobileCampaigns(churchId, status, limit) {
    let query = `
      SELECT
        id,
        name,
        status,
        scheduled_date,
        total_recipients,
        sent_recipients,
        failed_recipients,
        created_at
      FROM sms_campaigns
      WHERE source = 'mobile'
    `;
    const params = [];

    if (status) {
      query += ` AND status = $1`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUnifiedAnalytics(churchId, startDate, endDate) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [smsStats, memberStats, engagementStats] = await Promise.all([
      this.pool.query(
        `SELECT
          COUNT(*) as total_sent,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(recipient_count) as avg_recipients
        FROM sms_logs
        WHERE created_at BETWEEN $1 AND $2`,
        [start, end]
      ),
      this.pool.query(
        `SELECT
          COUNT(*) as total_members,
          COUNT(CASE WHEN updated_at > $2 THEN 1 END) as active_members
        FROM members
        WHERE is_active = true`,
        [start]
      ),
      this.pool.query(
        `SELECT
          COUNT(*) as total_interactions,
          COUNT(DISTINCT user_id) as unique_users
        FROM activities
        WHERE created_at BETWEEN $1 AND $2`,
        [start, end]
      )
    ]);

    return {
      sms: smsStats.rows[0],
      members: memberStats.rows[0],
      engagement: engagementStats.rows[0],
      period: { start, end }
    };
  }

  async getSmsAnalytics(churchId, startDate, endDate) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(recipient_count) as total_recipients
      FROM sms_logs
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const result = await this.pool.query(query, [start, end]);
    return result.rows;
  }

  async mobileLogin(email, password, deviceId, deviceName) {
    // This would integrate with the existing auth system
    // For now, return a mock response
    const userQuery = await this.pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (userQuery.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userQuery.rows[0];

    // In production, verify password hash here
    // For now, we'll assume password is valid

    // Generate tokens (this would use the existing JWT system)
    const accessToken = 'mock_access_token_' + Date.now();
    const refreshToken = 'mock_refresh_token_' + Date.now();

    // Register device if provided
    if (deviceId && deviceName) {
      await this.registerMobileDevice({
        deviceId,
        deviceName,
        platform: 'android',
        osVersion: 'unknown',
        userId: user.id,
        churchId: 1 // Default church ID
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        roles: user.roles,
        churchId: 1 // Default church ID
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600
      }
    };
  }

  async refreshAuthToken(refreshToken) {
    // This would validate the refresh token and issue new tokens
    // For now, return mock response
    return {
      accessToken: 'new_access_token_' + Date.now(),
      refreshToken: 'new_refresh_token_' + Date.now(),
      expiresIn: 3600
    };
  }

  async mobileLogout(userId, deviceId) {
    if (deviceId) {
      await this.pool.query(
        'UPDATE mobile_devices SET is_active = false WHERE device_id = $1 AND user_id = $2',
        [deviceId, userId]
      );
    }
  }

  async getSyncStatus(userId, churchId) {
    const query = `
      SELECT
        sync_type,
        status,
        last_sync,
        error_message
      FROM mobile_sync_status
      WHERE user_id = $1 AND church_id = $2
      ORDER BY last_sync DESC
    `;

    const result = await this.pool.query(query, [userId, churchId || 1]);
    return result.rows;
  }

  async updateSyncStatus(userId, churchId, syncType, status, timestamp) {
    const query = `
      INSERT INTO mobile_sync_status (user_id, church_id, sync_type, status, last_sync)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, church_id, sync_type)
      DO UPDATE SET
        status = $4,
        last_sync = $5,
        error_message = NULL
    `;

    await this.pool.query(query, [userId, churchId || 1, syncType, status, timestamp]);
  }

  async resetSync(userId, churchId) {
    await this.pool.query(
      'DELETE FROM mobile_sync_status WHERE user_id = $1 AND church_id = $2',
      [userId, churchId || 1]
    );
  }

  async getMobileDevices(userId, churchId) {
    const query = `
      SELECT
        id,
        device_id,
        device_name,
        platform,
        os_version,
        is_active,
        last_used,
        created_at
      FROM mobile_devices
      WHERE user_id = $1 AND church_id = $2
      ORDER BY last_used DESC
    `;

    const result = await this.pool.query(query, [userId, churchId || 1]);
    return result.rows;
  }

  async registerMobileDevice(deviceData) {
    const { deviceId, deviceName, platform, osVersion, userId, churchId } = deviceData;

    const query = `
      INSERT INTO mobile_devices (
        device_id, device_name, platform, os_version,
        user_id, church_id, is_active, last_used, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
      ON CONFLICT (device_id)
      DO UPDATE SET
        device_name = $2,
        platform = $3,
        os_version = $4,
        is_active = true,
        last_used = $7
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      deviceId, deviceName, platform, osVersion,
      userId, churchId || 1, new Date(), new Date()
    ]);

    return result.rows[0];
  }

  async unregisterMobileDevice(deviceId, userId) {
    await this.pool.query(
      'UPDATE mobile_devices SET is_active = false WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );
  }
}

module.exports = new MobileRepository();
