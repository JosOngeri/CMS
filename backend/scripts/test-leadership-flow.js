/**
 * Integration test for the department leadership + handover flow.
 * Runs against the live API as a Super Admin.
 * Usage: node scripts/test-leadership-flow.js
 */
require('dotenv').config();
const BASE_URL = process.env.BASE_URL || 'http://localhost:5005/api';

const email = process.env.TEST_EMAIL || 'admin@kiserian-sda.co.ke';
const password = process.env.TEST_PASSWORD || 'right123';

let TOKEN;
const api = async (method, path, body) => {
  const r = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
};

const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!cond) process.exitCode = 1;
};

(async () => {
  // Login
  const login = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  TOKEN = login.data?.accessToken;
  check('login', !!TOKEN);
  if (!TOKEN) return;

  // Pick a department + two users
  const depts = (await api('GET', '/departments')).body.departments || [];
  check('list departments', depts.length > 0, `(${depts.length})`);
  const dept = depts[0];
  const users = (await api('GET', '/users')).body.users || [];
  const [u1, u2] = users.filter((u) => u.is_active !== false);
  check('have two users', !!u1 && !!u2);

  // 1. Appoint assistant directly (seat vacant)
  const appt = await api('POST', `/departments/${dept.id}/leadership`, {
    user_id: u1.id, position: 'assistant', allocation_type: 'temporary',
    end_date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
  });
  check('appoint assistant (temporary)', appt.status === 201 && appt.body.data?.position === 'assistant',
    `-> ${JSON.stringify(appt.body).slice(0, 120)}`);

  // 2. Appoint a head — dept may already have a head => expect either
  //    direct grant (vacant) or a pending handover (occupied).
  const headAppt = await api('POST', `/departments/${dept.id}/leadership`, {
    user_id: u2.id, position: 'head', allocation_type: 'permanent',
  });
  check('head appointment response', headAppt.status === 201, `-> ${JSON.stringify(headAppt.body).slice(0, 140)}`);

  const handover = headAppt.body.handover;
  if (handover) {
    // 3. Accept as admin (manager override)
    const acc = await api('PUT', `/departments/handovers/${handover.id}/accept`);
    check('accept handover', acc.status === 200 && acc.body.data?.status === 'accepted',
      `-> ${JSON.stringify(acc.body).slice(0, 120)}`);

    // 4. Complete with full checklist (admin bypasses checklist)
    const comp = await api('PUT', `/departments/handovers/${handover.id}/complete`, {
      checklist: { records: true, funds_assets: true, pending_programs: true, keys_logins: true, member_roster: true },
    });
    check('complete handover', comp.status === 200, `-> ${JSON.stringify(comp.body).slice(0, 120)}`);

    // 5. head_id now points at incoming user
    const after = await api('GET', `/departments/${dept.id}/leadership`);
    const newHead = (after.body.data || []).find(
      (l) => l.is_active && l.position === 'head' && l.user_id === u2.id
    );
    check('new head has active leadership row', !!newHead);
  } else {
    check('head appointed directly (seat vacant)', headAppt.body.data?.position === 'head');
  }

  // 6. Revoke the assistant grant
  const ls = (await api('GET', `/departments/${dept.id}/leadership`)).body.data || [];
  const assistantRow = ls.find((l) => l.is_active && l.position === 'assistant' && l.user_id === u1.id);
  const rev = await api('DELETE', `/departments/${dept.id}/leadership/${assistantRow?.id}`);
  check('revoke assistant', rev.status === 200);

  // 7. Expiring view shows nothing weird
  const exp = await api('GET', '/departments/leadership/expiring');
  check('expiring endpoint', exp.status === 200 && Array.isArray(exp.body.data));

  console.log(process.exitCode ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(process.exitCode || 0);
})();
