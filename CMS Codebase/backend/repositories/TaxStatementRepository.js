const BaseRepository = require('./BaseRepository');
const { NotFoundError, ConflictError } = require('../helpers/errorHandler');

class TaxStatementRepository extends BaseRepository {
  constructor() {
    super('tax_statements');
  }

  async getAllTaxStatements(filters = {}, churchId) {
    const { year, member_id, status } = filters;

    let query = `
      SELECT ts.*,
             u.first_name || ' ' || u.last_name as member_name,
             u.email as member_email,
             u.phone as member_phone,
             u.address as member_address
      FROM ${this.tableName} ts
      LEFT JOIN users u ON ts.member_id = u.id
      WHERE ts.church_id = $1
    `;
    const params = [churchId];
    let paramCount = 1;

    if (year) {
      paramCount++;
      query += ` AND ts.tax_year = $${paramCount}`;
      params.push(year);
    }

    if (member_id) {
      paramCount++;
      query += ` AND ts.member_id = $${paramCount}`;
      params.push(member_id);
    }

    if (status) {
      paramCount++;
      query += ` AND ts.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY ts.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTaxStatementById(id, churchId) {
    const statementResult = await this.pool.query(
      `SELECT ts.*,
              u.first_name || ' ' || u.last_name as member_name,
              u.email as member_email,
              u.phone as member_phone,
              u.address as member_address
       FROM ${this.tableName} ts
       LEFT JOIN users u ON ts.member_id = u.id
       WHERE ts.id = $1 AND ts.church_id = $2`,
      [id, churchId]
    );

    if (statementResult.rows.length === 0) {
      return null;
    }

    // Get statement line items
    const lineItemsResult = await this.pool.query(
      `SELECT tsi.*, pc.name as category_name
       FROM tax_statement_items tsi
       LEFT JOIN payment_categories pc ON tsi.category_id = pc.id
       WHERE tsi.statement_id = $1
       ORDER BY tsi.payment_date ASC`,
      [id]
    );

    return {
      ...statementResult.rows[0],
      line_items: lineItemsResult.rows
    };
  }

  async checkExistingStatement(memberId, taxYear, churchId) {
    const result = await this.pool.query(
      'SELECT id FROM tax_statements WHERE member_id = $1 AND tax_year = $2 AND church_id = $3',
      [memberId, taxYear, churchId]
    );
    return result.rows[0];
  }

  async getMemberById(memberId, churchId) {
    const result = await this.pool.query(
      'SELECT id, first_name, last_name, email, phone, address FROM users WHERE id = $1 AND church_id = $2',
      [memberId, churchId]
    );
    return result.rows[0];
  }

  async getTaxDeductiblePayments(memberId, taxYear, churchId) {
    const result = await this.pool.query(
      `SELECT p.id, p.amount, p.payment_date, p.description, p.category_id, pc.name as category_name
       FROM payments p
       LEFT JOIN payment_categories pc ON p.category_id = pc.id
       WHERE p.member_id = $1
       AND p.church_id = $2
       AND p.status = 'completed'
       AND p.is_tax_deductible = true
       AND EXTRACT(YEAR FROM p.payment_date) = $3
       ORDER BY p.payment_date ASC`,
      [memberId, churchId, taxYear]
    );
    return result.rows;
  }

  async createTaxStatement(client, data) {
    const { member_id, tax_year, total_amount, generated_by, church_id } = data;

    const result = await client.query(
      `INSERT INTO ${this.tableName} (member_id, tax_year, total_amount, status, generated_by, church_id)
       VALUES ($1, $2, $3, 'generated', $4, $5)
       RETURNING *`,
      [member_id, tax_year, total_amount, generated_by, church_id]
    );
    return result.rows[0];
  }

  async createTaxStatementItem(client, data) {
    const { statement_id, payment_id, payment_date, amount, category_id, description } = data;

    await client.query(
      `INSERT INTO tax_statement_items (statement_id, payment_id, payment_date, amount, category_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [statement_id, payment_id, payment_date, amount, category_id, description]
    );
  }

  async getTaxStatementByIdSimple(id) {
    const result = await this.pool.query(
      'SELECT * FROM tax_statements WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async deleteTaxStatementItems(client, statementId) {
    await client.query('DELETE FROM tax_statement_items WHERE statement_id = $1', [statementId]);
  }

  async updateTaxStatement(client, id, data) {
    const { total_amount, regenerated_by } = data;

    const result = await client.query(
      `UPDATE ${this.tableName} 
       SET total_amount = $1, 
           status = 'regenerated',
           regenerated_at = CURRENT_TIMESTAMP,
           regenerated_by = $2
       WHERE id = $3
       RETURNING *`,
      [total_amount, regenerated_by, id]
    );
    return result.rows[0];
  }

  async markTaxStatementSent(id, sentBy) {
    const result = await this.pool.query(
      `UPDATE ${this.tableName}
       SET status = 'sent',
           sent_at = CURRENT_TIMESTAMP,
           sent_by = $1
       WHERE id = $2
       RETURNING *`,
      [sentBy, id]
    );
    return result.rows[0] || null;
  }

  async deleteTaxStatement(id) {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
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

  async generateTaxStatement(memberId, taxYear, generatedBy, churchId) {
    const client = await this.beginTransaction();
    try {
      const existing = await this.checkExistingStatement(memberId, taxYear, churchId);

      if (existing) {
        await this.rollbackTransaction(client);
        throw new ConflictError('Tax statement already exists for this member and year');
      }

      const member = await this.getMemberById(memberId, churchId);

      if (!member) {
        await this.rollbackTransaction(client);
        throw new NotFoundError('Member not found');
      }

      const payments = await this.getTaxDeductiblePayments(memberId, taxYear, churchId);
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const statement = await this.createTaxStatement(client, {
        member_id: memberId,
        tax_year: taxYear,
        total_amount: totalAmount,
        generated_by: generatedBy,
        church_id: churchId
      });

      const statementId = statement.id;

      for (const payment of payments) {
        await this.createTaxStatementItem(client, {
          statement_id: statementId,
          payment_id: payment.id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          category_id: payment.category_id,
          description: payment.description
        });
      }

      await this.commitTransaction(client);
      return statement;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  async regenerateTaxStatement(id, regeneratedBy, churchId) {
    const client = await this.beginTransaction();
    try {
      const statement = await this.getTaxStatementByIdSimple(id);

      if (!statement) {
        await this.rollbackTransaction(client);
        throw new NotFoundError('Tax statement not found');
      }

      await this.deleteTaxStatementItems(client, id);

      const payments = await this.getTaxDeductiblePayments(statement.member_id, statement.tax_year, churchId);
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const updatedStatement = await this.updateTaxStatement(client, id, {
        total_amount: totalAmount,
        regenerated_by: regeneratedBy
      });

      for (const payment of payments) {
        await this.createTaxStatementItem(client, {
          statement_id: id,
          payment_id: payment.id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          category_id: payment.category_id,
          description: payment.description
        });
      }

      await this.commitTransaction(client);
      return updatedStatement;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

module.exports = new TaxStatementRepository();
