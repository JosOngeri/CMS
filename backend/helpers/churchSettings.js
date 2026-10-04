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

/** Map of features/enable_* → bool for one church (nav/module gating). */
async function getFeatures(churchId) {
  const [announcements, events, liveStream, treasury] = await Promise.all([
    getBool(churchId, 'enable_announcements', true),
    getBool(churchId, 'enable_events', true),
    getBool(churchId, 'enable_live_stream', false),
    getBool(churchId, 'enable_treasury', true),
  ]);
  return {
    enable_announcements: announcements,
    enable_events: events,
    enable_live_stream: liveStream,
    enable_treasury: treasury,
  };
}

function clearChurchCache(churchId = null) {
  if (!churchId) return cache.clear();
  for (const k of cache.keys()) if (k.startsWith(`${churchId}|`)) cache.delete(k);
}

module.exports = { getSetting, getBool, getInt, getFeatures, clearChurchCache };
