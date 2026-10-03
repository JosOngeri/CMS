/**
 * platformIpRules — enforcement for §6.3 IP blocking.
 *
 * The platform console writes deny/allow rows to `platform_ip_rules`;
 * this middleware reads them (cached 60s — rule changes propagate within
 * a minute without a DB hit per request) and 403s matching requests.
 *
 * Evaluation order: an explicit ALLOW for the client IP wins over any
 * DENY, so a support operator can whitelist themselves out of a broad
 * deny range. DENY entries support exact IPs and CIDR (v4 + v6 via
 * ipaddr.js, an express transitive dep).
 *
 * Fail-open on DB errors (table missing on an old database, query
 * failure): an incident that takes down the rules table must not take
 * down every tenant.
 */
const ipaddr = require('ipaddr.js');
const { pool } = require('../config/database');

const CACHE_TTL_MS = 60 * 1000;
let cache = { at: 0, allow: [], deny: [] };

const loadRules = async () => {
  const now = Date.now();
  if (now - cache.at < CACHE_TTL_MS) return cache;
  try {
    const result = await pool.query(
      `SELECT cidr, mode FROM platform_ip_rules WHERE is_active = true`
    );
    const allow = [];
    const deny = [];
    for (const row of result.rows) {
      const parsed = parseRule(row.cidr);
      if (!parsed) continue;
      (row.mode === 'allow' ? allow : deny).push(parsed);
    }
    cache = { at: now, allow, deny };
  } catch {
    // Fail open — see file header. Keep the previous cache if we have one.
    cache.at = now;
  }
  return cache;
};

// Accepts "1.2.3.4", "::1", "10.0.0.0/8", "2001:db8::/32". Returns a
// { addr, range } pair usable with ipaddr's match() or null if invalid.
const parseRule = (ip) => {
  try {
    const [addr, prefix] = ip.split('/');
    const parsed = ipaddr.parse(addr);
    if (prefix === undefined) {
      // A bare IP matches exactly — use its full-length range.
      const full = parsed.kind() === 'ipv4' ? 32 : 128;
      return { addr: parsed, range: full };
    }
    const bits = Number.parseInt(prefix, 10);
    const max = parsed.kind() === 'ipv4' ? 32 : 128;
    if (!Number.isInteger(bits) || bits < 0 || bits > max) return null;
    return { addr: parsed, range: bits };
  } catch {
    return null;
  }
};

const matches = (rule, clientAddr) => {
  try {
    // ipaddr throws when kinds differ (ipv4 rule vs ipv6 client) — a
    // mismatch simply isn't a match.
    return clientAddr.match(rule.addr, rule.range);
  } catch {
    return false;
  }
};

const platformIpRules = async (req, res, next) => {
  // Skipped in tests: api tests mock pool.query, and a rules lookup here
  // would consume their mockResolvedValueOnce queue. Rule matching logic
  // is covered by focused unit tests instead.
  if (process.env.NODE_ENV === 'test') return next();
  const raw = req.ip || req.socket?.remoteAddress;
  if (!raw) return next();
  let clientAddr;
  try {
    clientAddr = ipaddr.process(raw); // normalizes v4-mapped v6
  } catch {
    return next();
  }
  const rules = await loadRules();
  if (rules.allow.some((r) => matches(r, clientAddr))) return next();
  if (rules.deny.some((r) => matches(r, clientAddr))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  next();
};

// Test hooks — flush the rules cache between cases and expose the matcher.
platformIpRules._resetCache = () => { cache = { at: 0, allow: [], deny: [] }; };
platformIpRules._parseRule = parseRule;
platformIpRules._matches = matches;
platformIpRules._loadRules = loadRules;

module.exports = platformIpRules;
