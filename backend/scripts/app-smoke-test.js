/**
 * Dynamic smoke test for every endpoint the mobile app uses.
 * Usage: BASE_URL=https://msabato.co.ke/api node scripts/app-smoke-test.js
 */
const BASE = process.env.BASE_URL || 'http://localhost:5000/api';
const EMAIL = process.env.TEST_EMAIL || 'member1@newlife.com';
const PASSWORD = process.env.TEST_PASSWORD || 'right123';

let token = null;
let passed = 0;
let failed = 0;
const failures = [];

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function check(name, method, path, body, validate) {
  try {
    const r = await req(method, path, body);
    const ok = r.status < 400 && (r.json?.success !== false) && (!validate || validate(r));
    if (ok) { passed++; console.log(`  PASS  ${name} (${r.status})`); }
    else {
      failed++;
      const detail = r.json?.error || r.json?.message || r.text.slice(0, 120);
      failures.push(`${name}: ${r.status} ${detail}`);
      console.log(`  FAIL  ${name} (${r.status}) ${detail}`);
    }
    return r;
  } catch (e) {
    failed++;
    failures.push(`${name}: ${e.message}`);
    console.log(`  FAIL  ${name} (${e.message})`);
    return null;
  }
}

async function main() {
  console.log(`Testing ${BASE} as ${EMAIL}\n`);

  const login = await check('login', 'POST', '/auth/login', { email: EMAIL, password: PASSWORD },
    r => r.json?.data?.accessToken);
  if (!login?.json?.data?.accessToken) {
    console.log('\nCannot continue without token');
    process.exit(1);
  }
  token = login.json.data.accessToken;
  const roles = login.json.data.user?.roles || [];
  console.log(`  roles: ${roles.join(', ')}`);

  await check('dashboard', 'GET', '/mobile/dashboard');
  await check('events list', 'GET', '/mobile/events', null,
    r => Array.isArray(r.json?.data?.data ?? r.json?.data?.events ?? r.json?.data));

  const events = (await req('GET', '/mobile/events')).json?.data?.data ?? [];
  if (events.length > 0) {
    await check('RSVP event', 'POST', `/mobile/events/${events[0].id}/rsvp`, { status: 'attending' });
    await check('cancel RSVP', 'POST', `/mobile/events/${events[0].id}/rsvp`, { status: 'cancelled' });
  } else {
    console.log('  SKIP  RSVP (no events)');
  }

  await check('my departments', 'GET', '/mobile/my-departments');
  await check('members list', 'GET', '/members?limit=5', null,
    r => r.json?.data?.members !== undefined);
  await check('approvals', 'GET', '/approvals?filter=pending', null,
    r => r.json?.data?.approvals !== undefined);
  await check('announcements', 'GET', '/announcements/public?limit=5');
  await check('documents', 'GET', '/documents');
  await check('membership card', 'GET', '/mobile/membership-card');
  await check('payment history', 'GET', '/payments/my-payments?limit=5');
  await check('notifications unread', 'GET', '/notifications/unread-count');
  await check('approvals pending-count', 'GET', '/approvals/pending-count');

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failures.length) failures.forEach(f => console.log(`  - ${f}`));
  process.exit(failed ? 1 : 0);
}

main();
