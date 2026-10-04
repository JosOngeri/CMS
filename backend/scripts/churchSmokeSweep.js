/**
 * @audit Church-side GET smoke sweep — enumerates every GET route registered
 *        in app.js and hits it with a minted Super Admin token on localhost.
 *        404/401/403 = pass (route works, just no row/permission); only
 *        500s (real crashes — usually schema drift) fail the run.
 * @usage  node backend/scripts/churchSmokeSweep.js [port]
 *         Runs on the VPS or locally against the running server.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const app = require('../app');

const PORT = process.argv[2] || process.env.PORT || 5000;

// Express 4: walk the router stack, decoding mount regexps to path prefixes.
const mountPrefix = (regexp) => {
  let p = regexp.source;
  if (p === '^\\/?(?=\\/|$)') return '';
  p = p
    .replace(/^\^/, '')                 // leading ^
    .replace(/\(\?=\\\/\|\$\)$/, '')     // (?=/|$)
    .replace(/\(\?=\/\|\$\)$/, '')
    .replace(/\\\/\?$/, '')              // trailing \/?
    .replace(/\\\//g, '/')               // unescape slashes
    .replace(/\$$/, '');                 // trailing $
  if (/[()[\]{}*+?|]/.test(p)) return '__skip__'; // param/regex mount — can't prefix safely
  return p === '/' ? '' : p;
};

const collectGetRoutes = (stack, prefix = '') => {
  const out = [];
  for (const layer of stack) {
    if (layer.route) {
      if (layer.route.methods.get) out.push(prefix + layer.route.path);
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      const mount = mountPrefix(layer.regexp);
      if (mount !== '__skip__') out.push(...collectGetRoutes(layer.handle.stack, prefix + mount));
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
  const uid = sa[0].id, cid = sa[0].church_id;

  // plausible real ids for path params — wrong-id gives 404 (fine), crash gives 500 (bug)
  const pick = async (q) => (await pool.query(q)).rows[0]?.id;
  const ids = {
    default: cid,
    memberId: await pick('SELECT id FROM members WHERE church_id = $1 LIMIT 1'.replace('$1', `'${cid}'`)),
    userId: uid,
    eventId: await pick(`SELECT id FROM events WHERE church_id = '${cid}' LIMIT 1`),
    deptId: await pick(`SELECT id FROM departments WHERE church_id = '${cid}' LIMIT 1`),
    paymentId: await pick(`SELECT id FROM payments WHERE church_id = '${cid}' LIMIT 1`),
    approvalId: await pick(`SELECT id FROM approval_requests WHERE church_id = '${cid}' LIMIT 1`),
    subId: await pick(`SELECT id FROM subcommittees WHERE church_id = '${cid}' LIMIT 1`).catch(() => null),
    id1: 1, // serial-int fallback
  };

  const fill = (path) => path
    .replace(/:churchId/g, cid)
    .replace(/:userId/g, ids.userId)
    .replace(/:memberId/g, ids.memberId || ids.id1)
    .replace(/:eventId/g, ids.eventId || ids.id1)
    .replace(/:departmentId|:deptId/g, ids.deptId || ids.id1)
    .replace(/:paymentId/g, ids.paymentId || ids.id1)
    .replace(/:approvalId/g, ids.approvalId || ids.id1)
    .replace(/:subcommitteeId|:subId/g, ids.subId || ids.id1)
    .replace(/:id|:.*$/g, (m) => (m.includes('Id') || m === ':id' ? ids.default : ids.id1));

  const token = jwt.sign(
    { userId: uid, roles: ['Super Admin'], mfaVerified: true, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'msabato', audience: 'church' }
  );
  const headers = { authorization: `Bearer ${token}` };

  const routes = [...new Set(collectGetRoutes(app._router.stack))]
    .filter((p) => p.startsWith('/api') && !p.startsWith('/api/platform'))
    .sort();
  console.log(`Sweeping ${routes.length} church GET routes on :${PORT}`);

  const failures = [];
  for (const p of routes) {
    const url = `http://localhost:${PORT}${fill(p)}`;
    try {
      const res = await fetch(url, { headers });
      if (res.status >= 500) {
        const body = (await res.text()).slice(0, 100).replace(/\n/g, ' ');
        failures.push(`${res.status} ${p} -> ${body}`);
        console.log('FAIL', res.status, p);
      }
    } catch (e) {
      failures.push(`ERR ${p} -> ${e.message}`);
      console.log('ERR', p, e.message);
    }
    await new Promise((s) => setTimeout(s, 50));
  }

  await pool.end();
  if (failures.length) {
    console.log(`\nSWEEP FAILED: ${failures.length}/${routes.length} 5xx`);
    failures.forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log(`SWEEP PASSED: ${routes.length} routes, no 5xx`);
};

run().catch((e) => { console.log('FATAL', e.message); process.exit(1); });
