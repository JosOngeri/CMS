const BaseRepository = require('./BaseRepository');

class TelegramAuthRepository extends BaseRepository {
  constructor() {
    super('telegram_auth_methods');
  }

  async getAllAuthMethods(churchId) {
    const result = await this.pool.query(
      `SELECT * FROM telegram_auth_methods
       WHERE church_id = $1 OR church_id IS NULL
       ORDER BY is_default DESC, created_at ASC`,
      [churchId]
    );
    return result.rows;
  }

  async unsetAllDefaults(churchId) {
    await this.pool.query(
      'UPDATE telegram_auth_methods SET is_default = false WHERE church_id = $1',
      [churchId]
    );
  }

  async createAuthMethod(data) {
    const { type, name, config, is_active, is_default, church_id } = data;
    const result = await this.pool.query(
      `INSERT INTO telegram_auth_methods (type, name, config, is_active, is_default, church_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [type, name, config, is_active, is_default, church_id]
    );
    return result.rows[0];
  }

  async updateAuthMethod(id, data, churchId) {
    const { type, name, config, is_active, is_default } = data;
    const result = await this.pool.query(
      `UPDATE telegram_auth_methods
       SET type = COALESCE($1, type),
           name = COALESCE($2, name),
           config = COALESCE($3, config),
           is_active = COALESCE($4, is_active),
           is_default = COALESCE($5, is_default),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND church_id = $7
       RETURNING *`,
      [type, name, config, is_active, is_default, id, churchId]
    );
    return result.rows[0];
  }

  async deleteAuthMethod(id, churchId) {
    await this.pool.query(
      'DELETE FROM telegram_auth_methods WHERE id = $1 AND church_id = $2',
      [id, churchId]
    );
  }

  async setDefault(id, churchId) {
    await this.pool.query(
      'UPDATE telegram_auth_methods SET is_default = true WHERE id = $1 AND church_id = $2',
      [id, churchId]
    );
  }

  async findAuthMethodById(id, churchId, includeGlobal = false) {
    const result = await this.pool.query(
      `SELECT * FROM telegram_auth_methods
       WHERE id = $1 AND (church_id = $2${includeGlobal ? ' OR church_id IS NULL' : ''})`,
      [id, churchId]
    );
    return result.rows[0];
  }

  async findDefaultMethod(churchId) {
    const result = await this.pool.query(
      `SELECT * FROM telegram_auth_methods
       WHERE is_default = true AND (church_id = $1 OR church_id IS NULL)
       ORDER BY church_id NULLS LAST
       LIMIT 1`,
      [churchId]
    );
    return result.rows[0];
  }

  async updateConfigPhoneNumber(phoneNumber, methodId, churchId) {
    const result = await this.pool.query(
      `UPDATE telegram_auth_methods
       SET config = jsonb_set(
         config,
         '{phoneNumber}',
         to_jsonb($1::text)
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND church_id = $3
       RETURNING *`,
      [phoneNumber, methodId, churchId]
    );
    return result.rows[0];
  }
}

module.exports = new TelegramAuthRepository();
