const BaseRepository = require('./BaseRepository');

class FixedAssetsRepository extends BaseRepository {
  constructor() {
    super('fixed_assets');
  }

  async getAllFixedAssets(filters = {}) {
    const { status, category, fund_id, churchId } = filters;
    
    let query = `
      SELECT fa.*, 
             f.fund_name,
             coa.account_name,
             v.vendor_name
      FROM ${this.tableName} fa
      LEFT JOIN funds f ON fa.fund_id = f.id
      LEFT JOIN chart_of_accounts coa ON fa.account_id = coa.id
      LEFT JOIN vendors v ON fa.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND fa.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (status) {
      paramCount++;
      query += ` AND fa.status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND fa.asset_type = $${paramCount}`;
      params.push(category);
    }

    if (fund_id) {
      paramCount++;
      query += ` AND fa.fund_id = $${paramCount}`;
      params.push(fund_id);
    }

    query += ` ORDER BY fa.purchase_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFixedAssetById(id, churchId = null) {
    const churchFilter = churchId ? ' AND fa.church_id = $2' : '';
    const result = await this.pool.query(
      `SELECT fa.*,
              f.fund_name,
              coa.account_name,
              coa.account_code,
              v.vendor_name
       FROM ${this.tableName} fa
       LEFT JOIN funds f ON fa.fund_id = f.id
       LEFT JOIN chart_of_accounts coa ON fa.account_id = coa.id
       LEFT JOIN vendors v ON fa.vendor_id = v.id
       WHERE fa.id = $1${churchFilter}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  async createFixedAsset(data) {
    const {
      asset_code, asset_name, description, asset_type, 
      purchase_date, purchase_price, current_value, 
      depreciation_method, useful_life, location, 
      fund_id, account_id, vendor_id, created_by, church_id
    } = data;

    const code = asset_code || `FA-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (asset_code, asset_name, description, asset_type, purchase_date, purchase_price, current_value, depreciation_method, useful_life, location, fund_id, account_id, vendor_id, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [code, asset_name, description, asset_type, purchase_date, purchase_price, current_value || purchase_price, depreciation_method, useful_life, location, fund_id, account_id, vendor_id, created_by, church_id]
    );
    return result.rows[0];
  }

  async updateFixedAsset(id, data) {
    const { 
      asset_name, description, asset_type, purchase_date, 
      purchase_price, current_value, depreciation_method, 
      useful_life, location, status, fund_id, account_id, vendor_id 
    } = data;

    const result = await this.pool.query(
      `UPDATE ${this.tableName} 
       SET asset_name = COALESCE($1, asset_name),
           description = COALESCE($2, description),
           asset_type = COALESCE($3, asset_type),
           purchase_date = COALESCE($4, purchase_date),
           purchase_price = COALESCE($5, purchase_price),
           current_value = COALESCE($6, current_value),
           depreciation_method = COALESCE($7, depreciation_method),
           useful_life = COALESCE($8, useful_life),
           location = COALESCE($9, location),
           status = COALESCE($10, status),
           fund_id = COALESCE($11, fund_id),
           account_id = COALESCE($12, account_id),
           vendor_id = COALESCE($13, vendor_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 ${data.church_id ? 'AND church_id = $15' : ''}
       RETURNING *`,
      [asset_name, description, asset_type, purchase_date, purchase_price, current_value, depreciation_method, useful_life, location, status, fund_id, account_id, vendor_id, id, ...(data.church_id ? [data.church_id] : [])]
    );
    return result.rows[0];
  }

  async deleteFixedAsset(id, churchId = null) {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 ${churchId ? 'AND church_id = $2' : ''} RETURNING *`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  async getAssetById(id, churchId = null) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 ${churchId ? 'AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  async updateDepreciation(id, accumulatedDepreciation, currentValue, churchId = null) {
    const result = await this.pool.query(
      `UPDATE ${this.tableName}
       SET accumulated_depreciation = $1,
           current_value = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 ${churchId ? 'AND church_id = $4' : ''}
       RETURNING *`,
      churchId ? [accumulatedDepreciation, currentValue, id, churchId] : [accumulatedDepreciation, currentValue, id]
    );
    return result.rows[0];
  }

  async updateAssetDisposal(id, disposalAmount, disposalDate, currentValue, churchId = null) {
    const result = await this.pool.query(
      `UPDATE ${this.tableName}
       SET status = 'disposed',
           disposal_amount = $1,
           disposal_date = $2,
           current_value = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 ${churchId ? 'AND church_id = $5' : ''}
       RETURNING *`,
      churchId ? [disposalAmount, disposalDate, currentValue, id, churchId] : [disposalAmount, disposalDate, currentValue, id]
    );
    return result.rows[0];
  }
}

module.exports = new FixedAssetsRepository();
