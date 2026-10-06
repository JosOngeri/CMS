const { pool } = require('../config/database');
const logger = require('../config/logging');

/**
 * Gateway Registry — tracks JOSms Android relay devices per church.
 *
 * Two layers:
 *  - liveSockets: churchId -> Map<socketId, deviceInfo>  (in-memory truth for
 *    "can a process_bulk emit reach a phone right now")
 *  - sms_gateway_devices table: durable device record so the webapp can show
 *    "last seen / battery / signal" even after the socket drops.
 *
 * isOnline() is the authoritative check sendViaJOSms must pass before it is
 * allowed to report a send as queued.
 */
class GatewayRegistry {
  constructor() {
    this.liveSockets = new Map(); // churchId -> Map<socketId, info>
    this.io = null;
  }

  setIo(io) {
    this.io = io;
  }

  /**
   * Called when an authenticated socket emits `register_relay`.
   * roomId is always derived from the socket's own church — never client input.
   */
  async register(churchId, socketId, info = {}) {
    if (!churchId) return null;
    const deviceId = String(info.deviceId || `socket:${socketId}`).slice(0, 120);
    const entry = {
      socketId,
      deviceId,
      userId: info.userId || null,
      label: info.label || null,
      appVersion: info.appVersion || null,
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      battery: typeof info.battery === 'number' ? info.battery : null,
      signal: typeof info.signal === 'number' ? info.signal : null,
    };

    if (!this.liveSockets.has(churchId)) this.liveSockets.set(churchId, new Map());
    this.liveSockets.get(churchId).set(socketId, entry);

    try {
      await pool.query(
        `INSERT INTO sms_gateway_devices
           (church_id, device_id, user_id, label, app_version, is_online, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT (church_id, device_id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           label = COALESCE(EXCLUDED.label, sms_gateway_devices.label),
           app_version = COALESCE(EXCLUDED.app_version, sms_gateway_devices.app_version),
           is_online = true,
           last_seen_at = NOW(),
           updated_at = NOW()`,
        [churchId, deviceId, info.userId || null, info.label || null, info.appVersion || null]
      );
    } catch (err) {
      logger.error('gatewayRegistry.register DB upsert failed:', err.message);
    }

    this._broadcastStatus(churchId);
    return entry;
  }

  /**
   * Socket disconnected — drop the live entry and mark the device offline.
   */
  async unregister(churchId, socketId) {
    if (!churchId) return;
    const room = this.liveSockets.get(churchId);
    const entry = room?.get(socketId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) this.liveSockets.delete(churchId);
    }
    if (entry?.deviceId) {
      try {
        await pool.query(
          `UPDATE sms_gateway_devices
             SET is_online = false, last_seen_at = NOW(), updated_at = NOW()
           WHERE church_id = $1 AND device_id = $2`,
          [churchId, entry.deviceId]
        );
      } catch (err) {
        logger.error('gatewayRegistry.unregister DB update failed:', err.message);
      }
    }
    this._broadcastStatus(churchId);
  }

  /**
   * Heartbeat — from the socket event or the REST endpoint. Updates live
   * metrics + durable last_heartbeat_at so the webapp can show health.
   */
  async heartbeat(churchId, deviceId, metrics = {}) {
    if (!churchId || !deviceId) return;
    const now = new Date().toISOString();

    // Update the live entry if this device holds a socket.
    const room = this.liveSockets.get(churchId);
    if (room) {
      for (const entry of room.values()) {
        if (entry.deviceId === deviceId) {
          entry.lastHeartbeat = now;
          if (typeof metrics.battery === 'number') entry.battery = metrics.battery;
          if (typeof metrics.signal === 'number') entry.signal = metrics.signal;
          if (metrics.appVersion) entry.appVersion = metrics.appVersion;
        }
      }
    }

    try {
      await pool.query(
        `INSERT INTO sms_gateway_devices
           (church_id, device_id, user_id, label, app_version, battery, signal, is_online, last_seen_at, last_heartbeat_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         ON CONFLICT (church_id, device_id) DO UPDATE SET
           battery = COALESCE(EXCLUDED.battery, sms_gateway_devices.battery),
           signal = COALESCE(EXCLUDED.signal, sms_gateway_devices.signal),
           app_version = COALESCE(EXCLUDED.app_version, sms_gateway_devices.app_version),
           label = COALESCE(EXCLUDED.label, sms_gateway_devices.label),
           last_heartbeat_at = NOW(),
           last_seen_at = NOW(),
           is_online = true,
           updated_at = NOW()`,
        [
          churchId, String(deviceId).slice(0, 120),
          metrics.userId || null, metrics.label || null, metrics.appVersion || null,
          typeof metrics.battery === 'number' ? metrics.battery : null,
          typeof metrics.signal === 'number' ? metrics.signal : null,
        ]
      );
    } catch (err) {
      logger.error('gatewayRegistry.heartbeat DB write failed:', err.message);
    }
  }

  /** True only when at least one relay socket is live for this church. */
  isOnline(churchId) {
    const room = this.liveSockets.get(churchId);
    return !!room && room.size > 0;
  }

  /** Count of live relay sockets for a church. */
  onlineCount(churchId) {
    return this.liveSockets.get(churchId)?.size || 0;
  }

  /**
   * Full status for the webapp: live socket truth merged with durable device
   * records (so offline devices still appear with last_seen_at).
   */
  async getStatus(churchId) {
    const room = this.liveSockets.get(churchId);
    const live = room ? Array.from(room.values()) : [];

    let devices = [];
    try {
      const result = await pool.query(
        `SELECT device_id, user_id, label, app_version, battery, signal,
                is_online, last_seen_at, last_heartbeat_at
         FROM sms_gateway_devices
         WHERE church_id = $1
         ORDER BY last_seen_at DESC NULLS LAST`,
        [churchId]
      );
      devices = result.rows;
    } catch (err) {
      // Table may not exist pre-migration — degrade gracefully.
      if (err.code !== '42P01') {
        logger.error('gatewayRegistry.getStatus DB read failed:', err.message);
      }
    }

    const liveIds = new Set(live.map(d => d.deviceId));
    return {
      online: live.length > 0,
      liveCount: live.length,
      liveDevices: live,
      devices: devices.map(d => ({
        ...d,
        is_online: liveIds.has(d.device_id) ? true : d.is_online,
      })),
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Push a `gateway_status` event to the church's own rooms so the webapp
   * (joined to church:{id}) sees presence flips without polling.
   */
  _broadcastStatus(churchId) {
    if (!this.io || !churchId) return;
    const online = this.isOnline(churchId);
    const payload = { churchId, online, liveCount: this.onlineCount(churchId), at: new Date().toISOString() };
    this.io.to(`church:${churchId}`).emit('gateway_status', payload);
    this.io.to(`relay:${churchId}`).emit('gateway_status', payload);
  }
}

module.exports = new GatewayRegistry();
