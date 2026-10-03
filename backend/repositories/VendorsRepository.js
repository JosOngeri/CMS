const BaseRepository = require('./BaseRepository');

class VendorsRepository extends BaseRepository {
  constructor() {
    super('vendors');
  }

  async getAllVendors(filters = {}) {
    const { is_active, search, church_id } = filters;
    if (!church_id) throw new Error('VendorsRepository.getAllVendors: church_id required');

    let query = `SELECT * FROM ${this.tableName} WHERE church_id = $1`;
    const params = [church_id];
    let paramCount = 1;

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

  async getVendorById(id, churchId) {
    if (!churchId) throw new Error('VendorsRepository.getVendorById: churchId required');
    const result = await this.pool.query(
      'SELECT * FROM vendors WHERE id = $1 AND church_id = $2', [id, churchId]);
    return result.rows[0];
  }

  async createVendor(data) {
    const { vendor_code, vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, created_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO vendors (vendor_code, vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [vendor_code, vendor_name, contact_person, phone, email, address, city, country, tax_id, payment_terms, created_by, church_id]
    );
    return result.rows[0];
  }

  // Updatable vendor columns; undefined keys are dropped before delegating to
  // BaseRepository.update (structured, column-allowlisted, tenant-scoped).
  static UPDATABLE_COLUMNS = [
    'vendor_name', 'contact_person', 'phone', 'email', 'address',
    'city', 'country', 'tax_id', 'payment_terms', 'is_active'
  ];

  async updateVendor(id, data, churchId) {
    if (!churchId) throw new Error('VendorsRepository.updateVendor: churchId required');
    const updates = {};
    for (const key of VendorsRepository.UPDATABLE_COLUMNS) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    updates.updated_at = new Date();
    return this.update(id, updates, churchId);
  }

  async getVendorTransactionCount(id, churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE vendor_id = $1 AND church_id = $2',
      [id, churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async archiveVendor(id, churchId) {
    const result = await this.pool.query(
      `UPDATE vendors SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, churchId]
    );
    return result.rows[0];
  }

  async deleteVendor(id, churchId) {
    const result = await this.pool.query(
      'DELETE FROM vendors WHERE id = $1 AND church_id = $2 RETURNING *', [id, churchId]);
    return result.rows[0];
  }
}

module.exports = new VendorsRepository();
