/**
 * @audit Church-side mutation smoke sweep — enumerates every POST/PUT/PATCH/
 *        DELETE route registered in app.js and hits it with a minted
 *        Super Admin token on localhost, sending a deliberately-empty JSON
 *        body and nonexistent path ids.
 *
 *        Expected responses: 400/422 (validation), 401/403 (authz),
 *        404 (fake id). A 5xx means the route crashed on junk input — the
 *        same bug class the GET sweep catches (schema drift, unhandled PG
 *        errors) plus missing-input-validation crashes.
 *
 *        2xx on an empty body is reported separately as "accepted junk
 *        input" — a validation gap, not a crash — and does not fail the run.
 *
 *        Path ids are filled with a random nonexistent UUID so DELETE/PUT
 *        can never hit a real row. Only :churchId gets a real value so
 *        tenant-scoped handlers still resolve their context.
 *
 * @usage  node backend/scripts/churchMutationSweep.js [port]
 *         Dev/local only — run against a disposable database.
 */
require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const app = require('../app');

const PORT = process.argv[2] || process.env.PORT || 5000;
const METHODS = ['post', 'put', 'patch', 'delete'];

// Express 4: walk the router stack, decoding mount regexps to path prefixes.
const mountPrefix = (regexp) => {
  let p = regexp.source;
  if (p === '^\\/?(?=\\/|$)') return '';
  p = p
    .replace(/^\^/, '')
    .replace(/\(\?=\\\/\|\$\)$/, '')
    .replace(/\(\?=\/\|\$\)$/, '')
    .replace(/\\\/\?$/, '')
    .replace(/\\\//g, '/')
    .replace(/\$$/, '');
  if (/[()[\]{}*+?|]/.test(p)) return '__skip__';
  return p === '/' ? '' : p;
};

const collectMutationRoutes = (stack, prefix = '') => {
  const out = [];
  for (const layer of stack) {
    if (layer.route) {
      for (const m of METHODS) {
        if (layer.route.methods[m]) out.push({ method: m.toUpperCase(), path: prefix + layer.route.path });
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      const mount = mountPrefix(layer.regexp);
      if (mount !== '__skip__') out.push(...collectMutationRoutes(layer.handle.stack, prefix + mount));
    }
  }
  return out;
};

const run = async () => {
  const { rows: sa } = await pool.query(
    `SELECT u.id, u.church_id FROM users u JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id WHERE r.name = 'Super Admin' AND u.is_active = true
     AND u.church_id IS NOT NULL LIMIT 1`
  );
  if (!sa[0]) { console.log('No Super Admin user found'); process.exit(1); }
  const cid = sa[0].church_id;

  // Random UUID for every id param — a nonexistent id yields 404 instead of
  // mutating a real row. :churchId stays real so tenant scoping resolves.
  const fakeId = crypto.randomUUID();
  const fill = (path) => path
    .replace(/:churchId/g, cid)
    .replace(/:[A-Za-z_]+/g, fakeId);

  const token = jwt.sign(
    { userId: sa[0].id, roles: ['Super Admin'], mfaVerified: true, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'msabato', audience: 'church' }
  );
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const seen = new Set();
  const routes = collectMutationRoutes(app._router.stack)
    .filter((r) => r.path.startsWith('/api') && !r.path.startsWith('/api/platform'))
    .filter((r) => { const k = `${r.method} ${r.path}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
  console.log(`Sweeping ${routes.length} church mutation routes on :${PORT}`);

  const failures = [];
  const acceptedJunk = [];
  let limited = 0;
  let skipped = 0;
  for (const r of routes) {
    const url = `http://localhost:${PORT}${fill(r.path)}`;
    try {
      const res = await fetch(url, { method: r.method, headers, body: '{}' });
      if (res.status === 429) {
        limited++;
      } else if (res.status >= 500) {
        const body = (await res.text()).slice(0, 300).replace(/\n/g, ' ');
        if (res.status === 503 && body.includes('_NOT_CONFIGURED')) {
          skipped++;
          console.log('SKIP', res.status, r.method, r.path, '(external provider not configured)');
        } else if (res.status === 502 && body.includes('_UPSTREAM_')) {
          skipped++;
          console.log('SKIP', res.status, r.method, r.path, '(external provider unavailable)');
        } else {
          failures.push(`${res.status} ${r.method} ${r.path} -> ${body}`);
          console.log('FAIL', res.status, r.method, r.path);
        }
      } else if (res.status < 300) {
        acceptedJunk.push(`${res.status} ${r.method} ${r.path}`);
        console.log('JUNK-OK', res.status, r.method, r.path);
      }
    } catch (e) {
      failures.push(`ERR ${r.method} ${r.path} -> ${e.message}`);
      console.log('ERR', r.method, r.path, e.message);
    }
    await new Promise((s) => setTimeout(s, 50));
  }

  await pool.end();
  if (limited) console.log(`RATE-LIMITED (uncounted): ${limited} routes hit 429`);
  if (skipped) console.log(`SKIPPED (uncounted): ${skipped} routes need unconfigured external providers`);
  if (acceptedJunk.length) {
    console.log(`\nACCEPTED EMPTY BODY (validation gaps, not crashes): ${acceptedJunk.length}`);
    acceptedJunk.forEach((f) => console.log('  ' + f));
  }
  if (failures.length) {
    console.log(`\nSWEEP FAILED: ${failures.length}/${routes.length} 5xx`);
    failures.forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log(`\nSWEEP PASSED: ${routes.length} routes, no 5xx`);
};

run().catch((e) => { console.log('FATAL', e.message); process.exit(1); });
