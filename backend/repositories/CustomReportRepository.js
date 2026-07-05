const BaseRepository = require('./BaseRepository');

class CustomReportRepository extends BaseRepository {
  constructor() {
    super('custom_reports');
  }

  async getAllCustomReports(filters = {}) {
    const { report_type, created_by } = filters;
    
    let query = `
      SELECT cr.*, 
             u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (report_type) {
      paramCount++;
      query += ` AND cr.report_type = $${paramCount}`;
      params.push(report_type);
    }

    if (created_by) {
      paramCount++;
      query += ` AND cr.created_by = $${paramCount}`;
      params.push(created_by);
    }

    query += ` ORDER BY cr.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCustomReportById(id) {
    const reportResult = await this.pool.query(
      `SELECT cr.*, 
              u.first_name || ' ' || u.last_name as created_by_name
       FROM ${this.tableName} cr
       LEFT JOIN users u ON cr.created_by = u.id
       WHERE cr.id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      return null;
    }

    const report = reportResult.rows[0];

    // Get report columns
    const columnsResult = await this.pool.query(
      'SELECT * FROM custom_report_columns WHERE report_id = $1 ORDER BY column_order ASC',
      [id]
    );

    // Get report filters
    const filtersResult = await this.pool.query(
      'SELECT * FROM custom_report_filters WHERE report_id = $1 ORDER BY filter_order ASC',
      [id]
    );

    return {
      ...report,
      columns: columnsResult.rows,
      filters: filtersResult.rows
    };
  }

  async createCustomReport(client, data, columns = [], filters = []) {
    const { 
      report_name, report_type, description, data_source, 
      group_by, order_by, created_by 
    } = data;

    const reportResult = await client.query(
      `INSERT INTO ${this.tableName} (report_name, report_type, description, data_source, group_by, order_by, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [report_name, report_type, description, data_source, group_by, order_by, created_by]
    );

    const reportId = reportResult.rows[0].id;

    // Insert columns if provided
    if (columns && Array.isArray(columns)) {
      for (let i = 0; i < columns.length; i++) {
        await client.query(
          `INSERT INTO custom_report_columns (report_id, column_name, column_alias, aggregation, column_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [reportId, columns[i].column_name, columns[i].column_alias, columns[i].aggregation, i]
        );
      }
    }

    // Insert filters if provided
    if (filters && Array.isArray(filters)) {
      for (let i = 0; i < filters.length; i++) {
        await client.query(
          `INSERT INTO custom_report_filters (report_id, filter_column, operator, filter_value, filter_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [reportId, filters[i].filter_column, filters[i].operator, filters[i].filter_value, i]
        );
      }
    }

    return reportResult.rows[0];
  }

  async updateCustomReport(client, id, data, columns = [], filters = []) {
    const { 
      report_name, report_type, description, data_source, 
      group_by, order_by 
    } = data;

    const reportResult = await client.query(
      `UPDATE ${this.tableName} 
       SET report_name = COALESCE($1, report_name),
           report_type = COALESCE($2, report_type),
           description = COALESCE($3, description),
           data_source = COALESCE($4, data_source),
           group_by = COALESCE($5, group_by),
           order_by = COALESCE($6, order_by),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [report_name, report_type, description, data_source, group_by, order_by, id]
    );

    // Update columns if provided
    if (columns && Array.isArray(columns)) {
      await client.query('DELETE FROM custom_report_columns WHERE report_id = $1', [id]);
      for (let i = 0; i < columns.length; i++) {
        await client.query(
          `INSERT INTO custom_report_columns (report_id, column_name, column_alias, aggregation, column_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, columns[i].column_name, columns[i].column_alias, columns[i].aggregation, i]
        );
      }
    }

    // Update filters if provided
    if (filters && Array.isArray(filters)) {
      await client.query('DELETE FROM custom_report_filters WHERE report_id = $1', [id]);
      for (let i = 0; i < filters.length; i++) {
        await client.query(
          `INSERT INTO custom_report_filters (report_id, filter_column, operator, filter_value, filter_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, filters[i].filter_column, filters[i].operator, filters[i].filter_value, i]
        );
      }
    }

    return reportResult.rows[0];
  }

  async deleteCustomReport(id) {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  }

  async getReportDefinition(id) {
    const reportResult = await this.pool.query(
      `SELECT cr.*, 
              crc.column_name, crc.column_alias, crc.aggregation,
              crf.filter_column, crf.operator, crf.filter_value
       FROM ${this.tableName} cr
       LEFT JOIN custom_report_columns crc ON cr.id = crc.report_id
       LEFT JOIN custom_report_filters crf ON cr.id = crf.report_id
       WHERE cr.id = $1`,
      [id]
    );

    return reportResult.rows;
  }

  async executeCustomQuery(query, params) {
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  async createCustomReportWithDetails(data, columns = [], filters = []) {
    const client = await this.beginTransaction();
    try {
      const result = await this.createCustomReport(client, data, columns, filters);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  async updateCustomReportWithDetails(id, data, columns = [], filters = []) {
    const client = await this.beginTransaction();
    try {
      const result = await this.updateCustomReport(client, id, data, columns, filters);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

module.exports = new CustomReportRepository();
