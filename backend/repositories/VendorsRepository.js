const BaseRepository = require('./BaseRepository');

class VendorsRepository extends BaseRepository {
  constructor() {
    super('vendors');
  }

  async getAllVendors(filters = {}) {
    const { is_active, search } = filters;

    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    if (search) {
      paramCount++;
      query += ` AND (vendor_name ILIKE $${paramCount} OR vendor_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY vendor_name ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getVendorById(id) {
    const result = await this.pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
    return result.rows[0];
  }

  async createVendor(data) {
    const { vendor_code, vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO vendors (vendor_code, vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [vendor_code, vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, created_by]
    );
    return result.rows[0];
  }

  async updateVendor(id, data) {
    const { vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, is_active } = data;

    const result = await this.pool.query(
      `UPDATE vendors
       SET vendor_name = COALESCE($1, vendor_name),
           contact_person = COALESCE($2, contact_person),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           country = COALESCE($7, country),
           tax_id = COALESCE($8, tax_id),
           payment_terms = COALESCE($9, payment_terms),
           is_active = COALESCE($10, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, is_active, id]
    );
    return result.rows[0] || null;
  }

  async getVendorTransactionCount(id) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE vendor_id = $1',
      [id]
    );
    return parseInt(result.rows[0].count);
  }

  async deleteVendor(id) {
    const result = await this.pool.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

module.exports = new VendorsRepository();
