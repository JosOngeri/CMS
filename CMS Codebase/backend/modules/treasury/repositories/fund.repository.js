/**
 * Fund Repository
 * Handles data access for funds
 */

const BaseRepository = require('../../../repositories/base.repository');
const Fund = require('../models/Fund');

class FundRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'funds', 'id');
  }

  async findAll(options = {}) {
    const { fund_type, is_active } = options;
    const where = {};
    if (fund_type) where.fund_type = fund_type;
    if (is_active !== undefined) where.is_active = is_active;
    
    const rows = await super.findAll({ where, orderBy: 'fund_code ASC' });
    return rows.map(row => Fund.fromDatabase(row));
  }

  async findById(id) {
    const row = await super.findById(id);
    return row ? Fund.fromDatabase(row) : null;
  }

  async findByFundCode(fundCode) {
    const query = 'SELECT * FROM funds WHERE fund_code = $1';
    const result = await this.pool.query(query, [fundCode]);
    return result.rows[0] ? Fund.fromDatabase(result.rows[0]) : null;
  }

  async create(fund) {
    const validation = fund.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const data = fund.toDatabase();
    const query = `
      INSERT INTO funds (fund_code, fund_name, fund_type, description, purpose, 
        start_date, end_date, target_amount, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.fund_code, data.fund_name, data.fund_type, data.description,
      data.purpose, data.start_date, data.end_date, data.target_amount, data.is_active
    ]);
    
    return Fund.fromDatabase(result.rows[0]);
  }

  async update(id, fund) {
    const data = fund.toDatabase();
    const query = `
      UPDATE funds SET
        fund_code = $1, fund_name = $2, fund_type = $3, description = $4,
        purpose = $5, start_date = $6, end_date = $7, target_amount = $8,
        is_active = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.fund_code, data.fund_name, data.fund_type, data.description,
      data.purpose, data.start_date, data.end_date, data.target_amount,
      data.is_active, id
    ]);
    
    return result.rows[0] ? Fund.fromDatabase(result.rows[0]) : null;
  }

  async updateBalance(id, amount) {
    const query = `
      UPDATE funds 
      SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [amount, id]);
    return result.rows[0] ? Fund.fromDatabase(result.rows[0]) : null;
  }

  async getFundBalances() {
    const query = `
      SELECT f.*,
        COALESCE((
          SELECT SUM(amount) FROM contributions WHERE fund_id = f.id
        ), 0) as total_contributions,
        COALESCE((
          SELECT SUM(amount) FROM expenses WHERE fund_id = f.id AND status = 'paid'
        ), 0) as total_expenses
      FROM funds f
      WHERE f.is_active = true
      ORDER BY f.fund_code
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }
}

module.exports = FundRepository;
