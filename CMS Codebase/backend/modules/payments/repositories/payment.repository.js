/**
 * Payment Repository
 * Handles data access for payments
 */

const BaseRepository = require('../../../repositories/base.repository');
const { Payment, PaymentItem, PaymentCategory } = require('../models/Payment');

class PaymentRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'payments', 'id');
  }

  async findAll(options = {}) {
    const { status, member_id, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    if (member_id) {
      whereClause += ` AND p.member_id = $${paramIndex++}`;
      params.push(member_id);
    }

    const query = `
      SELECT p.*, 
             u.first_name, u.last_name, u.email,
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'category_id', pi.category_id,
                 'category_name', pc.name,
                 'amount', pi.amount
               )
             ) as payment_items
      FROM payments p
      LEFT JOIN users u ON p.member_id = u.id
      LEFT JOIN payment_items pi ON p.id = pi.payment_id
      LEFT JOIN payment_categories pc ON pi.category_id = pc.id
      ${whereClause}
      GROUP BY p.id, u.first_name, u.last_name, u.email
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM payments p ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, params.slice(0, -2));

    return {
      payments: result.rows.map(row => Payment.fromDatabase(row)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }

  async findById(id) {
    const query = `
      SELECT p.*, 
             u.first_name, u.last_name, u.email,
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'category_id', pi.category_id,
                 'category_name', pc.name,
                 'amount', pi.amount
               )
             ) as payment_items
      FROM payments p
      LEFT JOIN users u ON p.member_id = u.id
      LEFT JOIN payment_items pi ON p.id = pi.payment_id
      LEFT JOIN payment_categories pc ON pi.category_id = pc.id
      WHERE p.id = $1
      GROUP BY p.id, u.first_name, u.last_name, u.email
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? Payment.fromDatabase(result.rows[0]) : null;
  }

  async findByTransactionId(transactionId) {
    const query = 'SELECT * FROM payments WHERE transaction_id = $1';
    const result = await this.pool.query(query, [transactionId]);
    return result.rows[0] ? Payment.fromDatabase(result.rows[0]) : null;
  }

  async create(payment, client = null) {
    const queryExecutor = client || this.pool;
    const data = payment.toDatabase();

    const query = `
      INSERT INTO payments (member_id, phone_number, amount, notes, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await queryExecutor.query(query, [
      data.member_id,
      data.phone_number,
      data.amount,
      data.notes,
      data.status
    ]);

    return Payment.fromDatabase(result.rows[0]);
  }

  async update(id, updates) {
    const data = updates.toDatabase();
    const query = `
      UPDATE payments SET
        phone_number = $1,
        amount = $2,
        notes = $3,
        status = $4,
        transaction_id = $5,
        mpesa_receipt_number = $6,
        payment_date = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      data.phone_number,
      data.amount,
      data.notes,
      data.status,
      data.transaction_id,
      data.mpesa_receipt_number,
      data.payment_date,
      id
    ]);

    return result.rows[0] ? Payment.fromDatabase(result.rows[0]) : null;
  }

  async updateStatus(id, status, additionalData = {}) {
    const query = `
      UPDATE payments SET
        status = $1,
        payment_date = $2,
        mpesa_receipt_number = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      status,
      additionalData.payment_date || (status === 'completed' ? new Date() : null),
      additionalData.mpesa_receipt_number || null,
      id
    ]);

    return result.rows[0] ? Payment.fromDatabase(result.rows[0]) : null;
  }

  async createPaymentItem(paymentItem, client = null) {
    const queryExecutor = client || this.pool;
    const data = paymentItem.toDatabase();

    const query = `
      INSERT INTO payment_items (payment_id, category_id, amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await queryExecutor.query(query, [
      data.payment_id,
      data.category_id,
      data.amount
    ]);

    return PaymentItem.fromDatabase(result.rows[0]);
  }

  async getPaymentItems(paymentId) {
    const query = `
      SELECT pi.*, pc.name as category_name
      FROM payment_items pi
      LEFT JOIN payment_categories pc ON pi.category_id = pc.id
      WHERE pi.payment_id = $1
    `;

    const result = await this.pool.query(query, [paymentId]);
    return result.rows.map(row => PaymentItem.fromDatabase(row));
  }

  async getCategories() {
    const query = `
      SELECT * FROM payment_categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC, name ASC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => PaymentCategory.fromDatabase(row));
  }

  async getCategoryById(id) {
    const query = 'SELECT * FROM payment_categories WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? PaymentCategory.fromDatabase(result.rows[0]) : null;
  }

  async createCategory(category) {
    const validation = category.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const data = category.toDatabase();
    const query = `
      INSERT INTO payment_categories (name, description, is_active, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      data.name,
      data.description,
      data.is_active,
      data.sort_order
    ]);

    return PaymentCategory.fromDatabase(result.rows[0]);
  }

  async updateCategory(id, category) {
    const data = category.toDatabase();
    const query = `
      UPDATE payment_categories SET
        name = $1,
        description = $2,
        is_active = $3,
        sort_order = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      data.name,
      data.description,
      data.is_active,
      data.sort_order,
      id
    ]);

    return result.rows[0] ? PaymentCategory.fromDatabase(result.rows[0]) : null;
  }

  async getPaymentStats(startDate, endDate) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY status
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }
}

module.exports = PaymentRepository;
