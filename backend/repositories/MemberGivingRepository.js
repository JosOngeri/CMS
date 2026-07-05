const BaseRepository = require('./BaseRepository');

class MemberGivingRepository extends BaseRepository {
  constructor() {
    super('payments');
  }

  async getMemberGivingHistory(filters) {
    const { member_id, start_date, end_date, category_id } = filters;

    let query = `
      SELECT p.*,
             pc.name as category_name,
             u.first_name || ' ' || u.last_name as member_name
      FROM payments p
      LEFT JOIN payment_categories pc ON p.category_id = pc.id
      LEFT JOIN users u ON p.member_id = u.id
      WHERE p.status = 'completed'
    `;
    const params = [];
    let paramCount = 0;

    if (member_id) {
      paramCount++;
      query += ` AND p.member_id = $${paramCount}`;
      params.push(member_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND p.payment_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND p.payment_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (category_id) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category_id);
    }

    query += ` ORDER BY p.payment_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getMemberGivingSummary(member_id, year) {
    const targetYear = year || new Date().getFullYear();

    let query = `
      SELECT
        pc.name as category_name,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount,
        MIN(p.amount) as min_amount,
        MAX(p.amount) as max_amount
      FROM payments p
      LEFT JOIN payment_categories pc ON p.category_id = pc.id
      WHERE p.status = 'completed'
      AND EXTRACT(YEAR FROM p.payment_date) = $1
    `;
    const params = [targetYear];

    if (member_id) {
      query += ` AND p.member_id = $2`;
      params.push(member_id);
    }

    query += ` GROUP BY pc.name ORDER BY total_amount DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getMemberGivingTrends(member_id, period, year) {
    const targetYear = year || new Date().getFullYear();

    let dateFormat;
    switch (period) {
      case 'weekly':
        dateFormat = 'W';
        break;
      case 'quarterly':
        dateFormat = 'Q';
        break;
      case 'monthly':
      default:
        dateFormat = 'MM';
        break;
    }

    let query = `
      SELECT
        TO_CHAR(p.payment_date, $1) as period,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.status = 'completed'
      AND EXTRACT(YEAR FROM p.payment_date) = $2
    `;
    const params = [dateFormat, targetYear];

    if (member_id) {
      query += ` AND p.member_id = $3`;
      params.push(member_id);
    }

    query += ` GROUP BY TO_CHAR(p.payment_date, $1) ORDER BY period`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTopGivers(limit, year, category_id) {
    const targetYear = year || new Date().getFullYear();

    let query = `
      SELECT
        u.id as member_id,
        u.first_name || ' ' || u.last_name as member_name,
        COUNT(p.id) as transaction_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount
      FROM payments p
      LEFT JOIN users u ON p.member_id = u.id
      WHERE p.status = 'completed'
      AND EXTRACT(YEAR FROM p.payment_date) = $1
    `;
    const params = [targetYear];

    if (category_id) {
      query += ` AND p.category_id = $2`;
      params.push(category_id);
    }

    query += ` GROUP BY u.id, u.first_name, u.last_name ORDER BY total_amount DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getMemberGivingComparison(member_id, currentYear, previousYear) {
    const query = `
      SELECT
        EXTRACT(YEAR FROM p.payment_date) as year,
        pc.name as category_name,
        SUM(p.amount) as total_amount
      FROM payments p
      LEFT JOIN payment_categories pc ON p.category_id = pc.id
      WHERE p.status = 'completed'
      AND p.member_id = $1
      AND EXTRACT(YEAR FROM p.payment_date) IN ($2, $3)
      GROUP BY EXTRACT(YEAR FROM p.payment_date), pc.name
      ORDER BY year DESC, total_amount DESC
    `;

    const result = await this.pool.query(query, [member_id, currentYear, previousYear]);
    return result.rows;
  }

  async getGivingByDepartment(year) {
    const targetYear = year || new Date().getFullYear();

    const query = `
      SELECT
        d.name as department_name,
        COUNT(DISTINCT p.member_id) as member_count,
        COUNT(p.id) as transaction_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount
      FROM payments p
      LEFT JOIN users u ON p.member_id = u.id
      LEFT JOIN department_members dm ON u.id = dm.user_id
      LEFT JOIN departments d ON dm.department_id = d.id
      WHERE p.status = 'completed'
      AND EXTRACT(YEAR FROM p.payment_date) = $1
      GROUP BY d.name
      ORDER BY total_amount DESC
    `;

    const result = await this.pool.query(query, [targetYear]);
    return result.rows;
  }
}

module.exports = new MemberGivingRepository();
