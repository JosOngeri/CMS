const BaseRepository = require('./BaseRepository');

class SmsAutomationRepository extends BaseRepository {
  constructor() {
    super('sms_automation_rules');
  }

  async getAllAutomationRules(filters = {}) {
    const { is_active, trigger_module } = filters;
    
    let query = `
      SELECT sar.*, 
             st.name as template_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} sar
      LEFT JOIN sms_templates st ON sar.template_id = st.id
      LEFT JOIN users u ON sar.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND sar.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    if (trigger_module) {
      paramCount++;
      query += ` AND sar.trigger_module = $${paramCount}`;
      params.push(trigger_module);
    }

    query += ` ORDER BY sar.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAutomationRuleById(id) {
    const result = await this.pool.query(
      `SELECT sar.*, 
              st.name as template_name,
              st.content as template_content,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM ${this.tableName} sar
       LEFT JOIN sms_templates st ON sar.template_id = st.id
       LEFT JOIN users u ON sar.created_by = u.id
       WHERE sar.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async getAutomationRuleByIdSimple(id) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async createAutomationRule(data) {
    const { name, trigger_module, trigger_event, template_id, conditions, is_active, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (name, trigger_module, trigger_event, template_id, conditions, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, trigger_module, trigger_event, template_id, conditions, is_active !== undefined ? is_active : true, created_by]
    );
    return result.rows[0];
  }

  async updateAutomationRule(id, data) {
    const { name, trigger_module, trigger_event, template_id, conditions, is_active } = data;

    const result = await this.pool.query(
      `UPDATE ${this.tableName} 
       SET name = COALESCE($1, name),
           trigger_module = COALESCE($2, trigger_module),
           trigger_event = COALESCE($3, trigger_event),
           template_id = COALESCE($4, template_id),
           conditions = COALESCE($5, conditions),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, trigger_module, trigger_event, template_id, conditions, is_active, id]
    );
    return result.rows[0];
  }

  async deleteAutomationRule(id) {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async getTemplateById(templateId) {
    const result = await this.pool.query(
      'SELECT * FROM sms_templates WHERE id = $1',
      [templateId]
    );
    return result.rows[0];
  }

  async getMatchingAutomationRules(module, event) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} 
       WHERE trigger_module = $1 
       AND trigger_event = $2 
       AND is_active = true`,
      [module, event]
    );
    return result.rows;
  }

  async getAutomationRulesByModule(triggerModule) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} 
       WHERE trigger_module = $1 
       ORDER BY created_at DESC`,
      [triggerModule]
    );
    return result.rows;
  }
}

module.exports = new SmsAutomationRepository();
