/**
 * Resolved church-settings reader — the consumer-facing half of the
 * platform-configurable settings catalog (constants/settingKeys.js).
 *
 * Resolution: church-scoped override row → church_id IS NULL global row →
 * manifest default → caller's fallback. Results are cached 60s per church
 * so login paths and hot consumers don't hit the DB every call.
 */
const settingsRepo = require('../repositories/SettingsRepository');
const { byKey } = require('../constants/settingKeys');
const { TENANT_FLAGS } = require('../constants/tenantFlags');
const { pool } = require('../config/database');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('churchSettings');
const TTL_MS = 60 * 1000;
const cache = new Map(); // `${churchId}|${key}` -> { value, at }

/**
 * @param {string|null} churchId
 * @param {string} key   settings.key (e.g. 'session_timeout')
 * @param {*} fallback   used when no row and no manifest default exists
 */
async function getSetting(churchId, key, fallback = null) {
  const cacheKey = `${churchId || 'global'}|${key}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const row = await settingsRepo.getByKey(key, churchId || null);
    let value = row ? row.value : undefined;
    if (value === undefined || value === null || value === '') {
      const def = byKey.get(key);
      value = def && def.default !== undefined ? def.default : fallback;
    }
    // Platform tenant_feature_flags override church enable_* settings —
    // an off flag reads as 'false' everywhere the church consults the key.
    if (churchId && key.startsWith('enable_') && TENANT_FLAGS.includes(key.slice(7))) {
      const flagMap = await getTenantFlagMap(churchId);
      if (flagMap[key] === false) value = 'false';
    }
    cache.set(cacheKey, { value, at: Date.now() });
    return value;
  } catch (e) {
    logger.error('getSetting', `read failed for ${key}`, e.message);
    return fallback;
  }
}

async function getBool(churchId, key, fallback = false) {
  const v = await getSetting(churchId, key, fallback);
  return v === true || v === 'true' || v === '1' || v === 1;
}

async function getInt(churchId, key, fallback) {
  const v = Number(await getSetting(churchId, key, fallback));
  return Number.isFinite(v) ? v : fallback;
}

/**
 * tenant_feature_flags → { enable_<flag>: bool } for one church, cached in the
 * same per-church bucket as settings so clearChurchCache() drops both.
 */
async function getTenantFlagMap(churchId) {
  if (!churchId) return {};
  const cacheKey = `${churchId}|__tenant_flags`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const { rows } = await pool.query(
      'SELECT flag, enabled FROM tenant_feature_flags WHERE church_id = $1',
      [churchId]
    );
    const stored = Object.fromEntries(rows.map((r) => [r.flag, r.enabled]));
    const value = Object.fromEntries(
      TENANT_FLAGS.map((f) => [`enable_${f}`, stored[f] !== false])
    );
    cache.set(cacheKey, { value, at: Date.now() });
    return value;
  } catch (e) {
    logger.error('getTenantFlagMap', `read failed for ${churchId}`, e.message);
    return {};
  }
}

/**
 * Map of enable_* → bool for one church (nav/module gating). Every
 * tenant_feature_flags row surfaces as enable_<flag>; where a settings key
 * covers the same module the platform flag ANDs with the church setting —
 * either side can switch the module off.
 */
async function getFeatures(churchId) {
  const [announcements, events, liveStream, treasury, flagMap] = await Promise.all([
    getBool(churchId, 'enable_announcements', true),
    getBool(churchId, 'enable_events', true),
    getBool(churchId, 'enable_live_stream', false),
    getBool(churchId, 'enable_treasury', true),
    getTenantFlagMap(churchId),
  ]);
  return {
    ...flagMap,
    enable_announcements: announcements && flagMap.enable_announcements !== false,
    enable_events: events && flagMap.enable_events !== false,
    enable_live_stream: liveStream && flagMap.enable_live_stream !== false,
    enable_treasury: treasury && flagMap.enable_treasury !== false,
  };
}

function clearChurchCache(churchId = null) {
  if (!churchId) return cache.clear();
  for (const k of cache.keys()) if (k.startsWith(`${churchId}|`)) cache.delete(k);
}

module.exports = { getSetting, getBool, getInt, getFeatures, clearChurchCache };
