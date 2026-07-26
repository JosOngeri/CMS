const BaseRepository = require('./BaseRepository');
const crypto = require('crypto');

class SnapshotRepository extends BaseRepository {
  constructor() {
    super('sms_daily_snapshots');
  }

  async findByChurchAndDate(churchId, snapshotDate) {
    const result = await this.pool.query(
      'SELECT * FROM sms_daily_snapshots WHERE church_id = $1 AND snapshot_date = $2',
      [churchId, snapshotDate]
    );
    return result.rows[0];
  }

  async createSnapshot(snapshotData) {
    const {
      church_id,
      snapshot_date,
      data_hash,
      compressed_data,
      file_size
    } = snapshotData;

    const result = await this.pool.query(
      `INSERT INTO sms_daily_snapshots (church_id, snapshot_date, data_hash, compressed_data, file_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [church_id, snapshot_date, data_hash, compressed_data, file_size]
    );
    return result.rows[0];
  }

  async getLatestSnapshot(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM sms_daily_snapshots WHERE church_id = $1 ORDER BY snapshot_date DESC LIMIT 1',
      [churchId]
    );
    return result.rows[0];
  }

  async getSnapshotsSince(churchId, sinceDate) {
    const result = await this.pool.query(
      'SELECT * FROM sms_daily_snapshots WHERE church_id = $1 AND snapshot_date >= $2 ORDER BY snapshot_date ASC',
      [churchId, sinceDate]
    );
    return result.rows;
  }

  async deleteSnapshot(churchId, snapshotDate) {
    const result = await this.pool.query(
      'DELETE FROM sms_daily_snapshots WHERE church_id = $1 AND snapshot_date = $2 RETURNING *',
      [churchId, snapshotDate]
    );
    return result.rows[0];
  }

  async deleteOldSnapshots(churchId, daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.pool.query(
      'DELETE FROM sms_daily_snapshots WHERE church_id = $1 AND snapshot_date < $2 RETURNING *',
      [churchId, cutoffDate]
    );
    return result.rows;
  }

  // Rolling update methods
  async createRollingUpdate(updateData) {
    const {
      church_id,
      update_type,
      entity_type,
      entity_id,
      operation,
      data,
      sequence_number
    } = updateData;

    const result = await this.pool.query(
      `INSERT INTO sms_rolling_updates (church_id, update_type, entity_type, entity_id, operation, data, sequence_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [church_id, update_type, entity_type, entity_id, operation, data, sequence_number]
    );
    return result.rows[0];
  }

  async getRollingUpdates(churchId, sinceSequence = null, limit = 100) {
    let query = 'SELECT * FROM sms_rolling_updates WHERE church_id = $1';
    const params = [churchId];

    if (sinceSequence !== null) {
      query += ' AND sequence_number > $2';
      params.push(sinceSequence);
    }

    query += ' ORDER BY sequence_number ASC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getNextSequenceNumber(churchId) {
    const result = await this.pool.query(
      'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM sms_rolling_updates WHERE church_id = $1',
      [churchId]
    );
    return result.rows[0].next_seq;
  }

  async deleteOldRollingUpdates(churchId, daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.pool.query(
      'DELETE FROM sms_rolling_updates WHERE church_id = $1 AND created_at < $2 RETURNING *',
      [churchId, cutoffDate]
    );
    return result.rows;
  }
}

module.exports = new SnapshotRepository();
