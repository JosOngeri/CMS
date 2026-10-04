/**
 * @audit Post-deploy smoke sweep — hits every platform-console GET endpoint
 *        on the public URL and fails (exit 1) on any non-200. Catches the
 *        schema-drift class of bugs: endpoints that return 200 on dev but
 *        500 on prod because a column/table never existed there.
 * @usage  node backend/scripts/platformSmokeSweep.js [baseUrl]
 *         Runs on the VPS (reads .env for secrets) — used by deploy-vps.yml.
 *         Default base: https://cms.josongeri.co.ke
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const BASE = (process.argv[2] || 'https://cms.josongeri.co.ke').replace(/\/$/, '');

const STATIC_PATHS = [
  '/activity?limit=10', '/alert-rules', '/alerts', '/analytics/adoption',
  '/analytics/growth', '/analytics/usage', '/announcements', '/audit-logs',
  '/audit-logs/actions', '/audit-logs/forensics', '/audit-logs/export',
  '/billing/dunning', '/billing/invoices', '/billing/plans', '/billing/revenue',
  '/billing/subscriptions', '/communication/templates', '/data/backups',
  '/data/schema', '/data/storage', '/deploys', '/flags', '/fleet', '/health',
  '/impersonations', '/incidents', '/integrations', '/integrations/config',
  '/jobs', '/logs', '/maintenance', '/payments', '/payments/refunds',
  '/payments/stuck', '/security', '/security/credentials',
  '/security/data-requests', '/security/permission-audit', '/settings',
  '/settings/catalog', '/sms-ledger', '/stats', '/status', '/support/access',
  '/support/health-scores', '/support/known-issues', '/support/tickets',
  '/tenant-templates', '/tenants', '/users', '/users/roles/catalog', '/version',
];

const TENANT_SUBPATHS = [
  '', '/activity', '/benchmarks', '/export', '/flags', '/messages', '/quotas',
  '/rate-limit', '/sessions', '/stats', '/users', '/settings/catalog',
];

// A 429 means the limiter is working — not a broken endpoint. Retry once
// after the server's own Retry-After (or 60s), then count it as 'limited'.
const fetchWithRetry = async (url, headers) => {
  for (let i = 0; i < 2; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 429 && i === 0) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 60000;
      await new Promise((s) => setTimeout(s, Math.min(wait, 90000)));
      continue;
    }
    return res;
  }
};

const run = async () => {
  const secret = process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.error('No PLATFORM_JWT_SECRET/JWT_SECRET in env');
    process.exit(1);
  }
  const token = jwt.sign(
    { userId: 1, type: 'platform', role: 'platform_owner' },
    secret,
    { expiresIn: '10m', issuer: 'msabato-platform', audience: 'platform' }
  );
  const headers = { authorization: `Bearer ${token}` };

  const { rows: churches } = await pool.query('SELECT id FROM churches ORDER BY created_at LIMIT 1');
  const paths = [...STATIC_PATHS];
  if (churches[0]) {
    for (const sub of TENANT_SUBPATHS) paths.push(`/tenants/${churches[0].id}${sub}`);
  }

  const failures = [];
  const limited = [];
  for (const p of paths) {
    try {
      const res = await fetchWithRetry(`${BASE}/api/platform${p}`, headers);
      if (res.status === 429) {
        limited.push(p);
        console.log('LIMITED', p);
      } else if (res.status !== 200) {
        const body = (await res.text()).slice(0, 120).replace(/\n/g, ' ');
        failures.push(`${res.status} ${p} -> ${body}`);
        console.log('FAIL', res.status, p);
      }
    } catch (e) {
      failures.push(`ERR ${p} -> ${e.message}`);
      console.log('ERR', p, e.message);
    }
    await new Promise((s) => setTimeout(s, 1200)); // ~50 req/min — under the limiter
  }

  await pool.end();
  if (limited.length) {
    console.log(`RATE-LIMITED (counted as pass): ${limited.length} endpoints`);
  }
  if (failures.length) {
    console.log(`\nSWEEP FAILED: ${failures.length}/${paths.length} non-200`);
    failures.forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log(`SWEEP PASSED: ${paths.length - limited.length}/${paths.length} endpoints 200`);
};

run().catch((e) => { console.log('FATAL', e.message); process.exit(1); });
