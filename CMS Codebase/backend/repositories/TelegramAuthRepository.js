const BaseRepository = require('./BaseRepository');

class TelegramAuthRepository extends BaseRepository {
  constructor() {
    super('telegram_auth_methods');
  }

  async getAllAuthMethods() {
    const result = await this.pool.query(
      'SELECT * FROM telegram_auth_methods ORDER BY is_default DESC, created_at ASC'
    );
    return result.rows;
  }

  async unsetAllDefaults() {
    await this.pool.query('UPDATE telegram_auth_methods SET is_default = false');
  }

  async createAuthMethod(data) {
    const { type, name, config, is_active, is_default } = data;
    const result = await this.pool.query(
      `INSERT INTO telegram_auth_methods (type, name, config, is_active, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, name, config, is_active, is_default]
    );
    return result.rows[0];
  }

  async updateAuthMethod(id, data) {
    const { type, name, config, is_active, is_default } = data;
    const result = await this.pool.query(
      `UPDATE telegram_auth_methods
       SET type = COALESCE($1, type),
           name = COALESCE($2, name),
           config = COALESCE($3, config),
           is_active = COALESCE($4, is_active),
           is_default = COALESCE($5, is_default),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [type, name, config, is_active, is_default, id]
    );
    return result.rows[0];
  }

  async deleteAuthMethod(id) {
    await this.pool.query('DELETE FROM telegram_auth_methods WHERE id = $1', [id]);
  }

  async setDefault(id) {
    await this.pool.query('UPDATE telegram_auth_methods SET is_default = true WHERE id = $1', [id]);
  }

  async findAuthMethodById(id) {
    const result = await this.pool.query(
      'SELECT * FROM telegram_auth_methods WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async findDefaultMethod() {
    const result = await this.pool.query(
      'SELECT * FROM telegram_auth_methods WHERE is_default = true LIMIT 1'
    );
    return result.rows[0];
  }

  async updateConfigPhoneNumber(phoneNumber, methodId) {
    await this.pool.query(
      `UPDATE telegram_auth_methods
       SET config = jsonb_set(
         config,
         '{phoneNumber}',
         $1
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [phoneNumber, methodId]
    );
  }
}

module.exports = new TelegramAuthRepository();
