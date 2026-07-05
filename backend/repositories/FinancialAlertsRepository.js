const BaseRepository = require('./BaseRepository');

class FinancialAlertsRepository extends BaseRepository {
  constructor() {
    super('financial_alerts');
  }

  async getActiveAlerts(churchId = null) {
    let query = `
      SELECT fa.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE fa.is_active = true
    `;
    const params = [];

    if (churchId) {
      query += ` AND fa.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY fa.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByType(alertType, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE alert_type = $1`;
    const params = [alertType];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTriggeredAlerts(churchId = null) {
    let query = `
      SELECT fa.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE fa.status = 'triggered'
    `;
    const params = [];

    if (churchId) {
      query += ` AND fa.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY fa.triggered_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAlertStats(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN status = 'triggered' THEN 1 END) as triggered_alerts,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
        COUNT(CASE WHEN alert_type = 'budget' THEN 1 END) as budget_alerts,
        COUNT(CASE WHEN alert_type = 'cash_flow' THEN 1 END) as cash_flow_alerts
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getRecentAlerts(limit = 10, churchId = null) {
    let query = `
      SELECT fa.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND fa.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY fa.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findAllWithUser(filters = {}, churchId = null) {
    let query = `
      SELECT fa.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND fa.church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    Object.entries(filters).forEach(([key, value]) => {
      query += ` AND fa.${key} = $${params.length + 1}`;
      params.push(value);
    });

    query += ` ORDER BY fa.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findByIdWithUser(id) {
    const result = await this.pool.query(
      `SELECT fa.*,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM ${this.tableName} fa
       LEFT JOIN users u ON fa.created_by = u.id
       WHERE fa.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async createAlert(data) {
    const { alert_type, title, message, priority, entity_type, entity_id, threshold_value, current_value, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO financial_alerts (alert_type, title, message, priority, entity_type, entity_id, threshold_value, current_value, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [alert_type, title, message, priority, entity_type, entity_id, threshold_value, current_value, created_by]
    );
    return result.rows[0];
  }

  async resolveAlert(id, resolution_notes, resolved_by) {
    const result = await this.pool.query(
      `UPDATE financial_alerts
       SET is_resolved = true,
           resolution_notes = $1,
           resolved_at = CURRENT_TIMESTAMP,
           resolved_by = $2
       WHERE id = $3
       RETURNING *`,
      [resolution_notes, resolved_by, id]
    );
    return result.rows[0];
  }

  async deleteAlert(id) {
    const result = await this.pool.query('DELETE FROM financial_alerts WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async checkBudgetAlerts(churchId, varianceThreshold, userId) {
    const result = await this.pool.query(
      `SELECT b.*,
              d.name as department_name,
              f.fund_name
       FROM budgets b
       LEFT JOIN departments d ON b.department_id = d.id
       LEFT JOIN funds f ON b.fund_id = f.id
       WHERE b.church_id = $1
       AND b.status = 'approved'
       AND ABS(b.variance_percentage) > $2
       ORDER BY ABS(b.variance_percentage) DESC`,
      [churchId, varianceThreshold]
    );
    return result.rows;
  }

  async checkExistingAlert(entityType, entityId) {
    const result = await this.pool.query(
      'SELECT id FROM financial_alerts WHERE entity_type = $1 AND entity_id = $2 AND is_resolved = false',
      [entityType, entityId]
    );
    return result.rows[0];
  }

  async checkFundAlerts(churchId, minBalance, userId) {
    const result = await this.pool.query(
      `SELECT f.*,
              (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE -t.amount END), 0)
               FROM transactions t
               WHERE t.status = 'approved'
               AND t.fund_id = f.id) as current_balance
       FROM funds f
       WHERE f.church_id = $1
       AND f.is_active = true
       ORDER BY current_balance ASC`,
      [churchId]
    );

    // Filter funds with low balance
    return result.rows.filter(fund => fund.current_balance < minBalance);
  }

  async checkOverduePayments(churchId, overdueDays, userId) {
    const result = await this.pool.query(
      `SELECT p.*,
              u.first_name || ' ' || u.last_name as member_name
       FROM payments p
       LEFT JOIN users u ON p.member_id = u.id
       WHERE p.church_id = $1
       AND p.status = 'pending'
       AND p.created_at < CURRENT_DATE - INTERVAL '1 day' * $2`,
      [churchId, overdueDays]
    );
    return result.rows;
  }
}

module.exports = new FinancialAlertsRepository();
