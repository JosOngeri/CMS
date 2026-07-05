const BaseRepository = require('./BaseRepository');

class GatewayRepository extends BaseRepository {
  constructor() {
    super('sms_gateways');
  }

  async registerDevice(data) {
    const { deviceId, churchId, model, batteryLevel, signalStrength } = data;

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (id, church_id, device_model, battery_level, signal_strength, last_seen)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
          battery_level = $4,
          signal_strength = $5,
          last_seen = CURRENT_TIMESTAMP`,
      [deviceId, churchId, model, batteryLevel, signalStrength]
    );
    return result;
  }

  async getStatus(churchId) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE church_id = $1`,
      [churchId]
    );
    return result.rows;
  }
}

module.exports = new GatewayRepository();
