/**
 * seed-test-permutations.js
 *
 * Fills every table the live-usage test plan touches with at least one
 * realistic row PER CHURCH, covering status/type/category variations so all
 * UI states (pending/approved/rejected, open/closed, active/inactive,
 * featured/private, per-tenant isolation) can be exercised.
 *
 * Idempotent: every row is looked up by a natural key before insert — safe
 * to re-run; existing rows are skipped, missing ones added.
 *
 * Usage:  node scripts/seed-test-permutations.js
 * Requires dev/local DB (requireDevDatabase guard).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { requireDevDatabase } = require('./_scriptSafety');

requireDevDatabase('seed-test-permutations.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let inserted = 0;
let skipped = 0;
const tableColumns = {}; // table -> Set of column names (loaded once in main)

async function loadTableColumns() {
  const r = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public'`
  );
  for (const { table_name, column_name } of r.rows) {
    (tableColumns[table_name] ||= new Set()).add(column_name);
  }
}

// Return only the row keys that are real columns — guards against schema
// drift making a seed insert reference a dropped column.
function pick(table, row) {
  const cols = tableColumns[table];
  if (!cols) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) if (cols.has(k)) out[k] = v;
  return out;
}

/**
 * Return the id of an existing row matching `match`, else INSERT `row`
 * (merged with match) and return its id. Every seeded row flows through this,
 * which is what makes the script idempotent. Tables without an `id` column
 * (join tables) return the first match key instead.
 */
async function getOrInsert(table, match, row) {
  const keys = Object.keys(match);
  // NULL-safe: "= NULL" never matches; emit IS NULL and skip the bind param
  const whereParts = [];
  const params = [];
  for (const k of keys) {
    if (match[k] === null) whereParts.push(`${k} IS NULL`);
    else { params.push(match[k]); whereParts.push(`${k} = $${params.length}`); }
  }
  const keyCol = (tableColumns[table]?.has('id')) ? 'id' : keys[0];
  const existing = await pool.query(
    `SELECT ${keyCol} FROM ${table} WHERE ${whereParts.join(' AND ')} LIMIT 1`,
    params
  );
  if (existing.rows.length) { skipped++; return existing.rows[0][keyCol]; }

  const data = { ...pick(table, match), ...pick(table, row) };
  const cols = Object.keys(data);
  const returning = tableColumns[table]?.has('id') ? 'RETURNING id' : `RETURNING ${cols[0]}`;
  const q = await pool.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) ${returning}`,
    cols.map(c => data[c])
  );
  inserted++;
  if (process.env.SEED_DEBUG) console.log(`    + ${table}`, JSON.stringify(match).slice(0, 120));
  return q.rows[0][tableColumns[table]?.has('id') ? 'id' : cols[0]];
}

/** Plain insert when a table has no reliable natural key (logs, join rows). */
async function insertOnce(table, match, row) {
  return getOrInsert(table, match, row);
}

async function one(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows[0] || null;
}

const daysAgo = n => new Date(Date.now() - n * 864e5);
const daysAhead = n => new Date(Date.now() + n * 864e5);
const KES = n => n; // numeric column; keep semantic naming for readability

// ---------------------------------------------------------------------------
// Real seed files (gallery photos, documents, resources)
// ---------------------------------------------------------------------------

const UPLOADS = path.join(__dirname, '..', 'uploads');

// A real (if tiny) PNG per accent colour — displayable, not a placeholder.
const PNGS = {
  'seed-blue.png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'seed-gold.png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'seed-green.png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
};

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
  '4 0 obj<</Length 60>>stream\nBT /F1 18 Tf 100 700 Td (Seeded test document) Tj ET\nendstream endobj\n' +
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF\n'
);

function ensureUploads() {
  const galleryDir = path.join(UPLOADS, 'gallery');
  const docsDir = path.join(UPLOADS, 'documents');
  const resDir = path.join(UPLOADS, 'resources');
  for (const d of [galleryDir, docsDir, resDir]) fs.mkdirSync(d, { recursive: true });
  for (const [name, b64] of Object.entries(PNGS)) {
    const p = path.join(galleryDir, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  }
  const pdf = path.join(docsDir, 'seed-constitution.pdf');
  if (!fs.existsSync(pdf)) fs.writeFileSync(pdf, MINIMAL_PDF);
  const handbook = path.join(resDir, 'seed-handbook.pdf');
  if (!fs.existsSync(handbook)) fs.writeFileSync(handbook, MINIMAL_PDF);
}

// ---------------------------------------------------------------------------
// Per-church context: pick existing users/members/departments to attach data
// ---------------------------------------------------------------------------

async function buildContext(church) {
  const cid = church.id;
  const pickUser = async (role) => one(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE u.church_id = $1 AND r.name = $2 ORDER BY u.created_at LIMIT 1`, [cid, role]);
  const anyUser = async () => one(
    `SELECT id FROM users WHERE church_id = $1 AND is_active IS NOT FALSE ORDER BY created_at LIMIT 1`, [cid]);
  const member = async () => one(
    `SELECT id, user_id FROM members WHERE church_id = $1 ORDER BY created_at LIMIT 1`, [cid]);
  const dept = async () => one(
    `SELECT id, name FROM departments WHERE church_id = $1 ORDER BY created_at LIMIT 1`, [cid])
    || one(`SELECT id, name FROM departments ORDER BY created_at LIMIT 1`);
  const payment = async () => one(
    `SELECT id, member_id, user_id, amount FROM payments WHERE church_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`, [cid])
    || one(`SELECT id, member_id, user_id, amount FROM payments WHERE church_id = $1 LIMIT 1`, [cid]);
  const event = async () => one(
    `SELECT id FROM events WHERE church_id = $1 LIMIT 1`, [cid]).catch?.(() => null);

  const treasurer = await pickUser('Treasurer');
  const pastor = await pickUser('Pastor');
  const deptHead = await pickUser('Department Head');
  const memberUser = (await pickUser('Member')) || await anyUser();
  const fallback = treasurer || pastor || deptHead || memberUser;
  const mem = await member();
  const department = await dept();
  const pay = await payment();
  let evt = null;
  try { evt = await one(`SELECT id FROM events WHERE church_id = $1 ORDER BY event_date LIMIT 1`, [cid]); } catch (_) {}

  return {
    churchId: cid,
    slug: church.slug,
    // <=8-char token for varchar(20) code columns
    short: church.slug.split('-').map(w => w[0]).join('').slice(0, 8),
    treasurerId: treasurer?.id || fallback?.id,
    pastorId: pastor?.id || fallback?.id,
    deptHeadId: deptHead?.id || fallback?.id,
    memberUserId: memberUser?.id || fallback?.id,
    memberId: mem?.id,
    memberUserFromMember: mem?.user_id,
    departmentId: department?.id,
    paymentId: pay?.id,
    paymentMemberId: pay?.member_id,
    eventId: evt?.id,
  };
}

// ---------------------------------------------------------------------------
// Seed domains — each function seeds one module for one church
// ---------------------------------------------------------------------------

async function seedFinance(ctx) {
  const c = ctx.churchId;

  // --- chart of accounts (double-entry coverage: every account_type) ---
  const coaRows = [
    ['1000', 'Cash on Hand', 'asset', 'current_asset'],
    ['1010', 'Bank - KCB Current', 'asset', 'current_asset'],
    ['1020', 'M-Pesa Till', 'asset', 'current_asset'],
    ['2000', 'Accounts Payable', 'liability', 'current_liability'],
    ['3000', 'General Fund Equity', 'equity', 'equity'],
    ['4000', 'Tithes Income', 'income', 'tithe'],
    ['4010', 'Offerings Income', 'income', 'offering'],
    ['5000', 'Utilities Expense', 'expense', 'operating'],
    ['5010', 'Salaries Expense', 'expense', 'operating'],
  ];
  const coa = {};
  for (const [code, name, type, sub] of coaRows) {
    coa[code] = await getOrInsert('chart_of_accounts',
      { church_id: c, account_code: code },
      { account_name: name, account_type: type, sub_type: sub, is_active: true, balance: type === 'asset' ? 150000 : 0 });
  }

  // --- funds ---
  const funds = {};
  for (const [code, name, type] of [
    ['GF-001', 'General Fund', 'general'],
    ['BF-001', 'Building Fund', 'restricted'],
    ['MF-001', 'Mission Fund', 'restricted'],
  ]) {
    funds[code] = await getOrInsert('funds',
      { church_id: c, fund_code: code },
      { fund_name: name, fund_type: type, current_balance: 250000, is_active: true, description: `${name} for ${ctx.slug}` });
  }

  // --- accounts + church bank accounts ---
  await getOrInsert('accounts', { church_id: c, account_number: `KCB-1001-${ctx.slug}` },
    { account_name: 'KCB Operating Account', account_type: 'asset', sub_type: 'bank', is_active: true });
  await getOrInsert('accounts', { church_id: c, account_number: `MPESA-2001-${ctx.slug}` },
    { account_name: 'M-Pesa Paybill', account_type: 'asset', sub_type: 'mobile_money', is_active: true });
  await getOrInsert('church_accounts', { church_id: c, account_number: '0123456789' },
    { account_name: 'Main Bank Account', bank_name: 'KCB', account_type: 'checking', balance: 500000, currency: 'KES', is_active: true });
  await getOrInsert('church_accounts', { church_id: c, account_number: 'TILL-555000' },
    { account_name: 'M-Pesa Till', bank_name: 'Safaricom', account_type: 'mobile_money', balance: 120000, currency: 'KES', is_active: true });

  // --- categories (code is globally unique — suffix with slug) ---
  for (const [name, code] of [['Tithe', 'TITHE'], ['Offering', 'OFFER'], ['Donation', 'DON']]) {
    await getOrInsert('income_categories', { church_id: c, name },
      { code: `${code}-${ctx.short}`, description: `${name} income category` });
  }
  for (const [name, code] of [['Utilities', 'UTIL'], ['Salaries', 'SAL'], ['Supplies', 'SUPP'], ['Events', 'EVT']]) {
    await getOrInsert('expense_categories', { church_id: c, name },
      { code: `${code}-${ctx.short}`, description: `${name} expense category`, budget_limit: 100000 });
  }

  // --- vendors ---
  const vendor1 = await getOrInsert('vendors', { church_id: c, vendor_code: `VEN-001-${ctx.slug}` },
    { vendor_name: 'Nairobi Office Supplies', contact_person: 'Jane Wambui', phone: '0722000111', email: 'sales@nairobisupplies.co.ke', city: 'Nairobi', country: 'Kenya', is_active: true, created_by: ctx.treasurerId });
  const vendor2 = await getOrInsert('vendors', { church_id: c, vendor_code: `VEN-002-${ctx.slug}` },
    { vendor_name: 'Kenya Power & Lighting', contact_person: 'Accounts Desk', phone: '0717000111', email: 'billing@kplc.co.ke', city: 'Kiserian', country: 'Kenya', is_active: true, created_by: ctx.treasurerId });

  // --- projects + milestones + contributions ---
  const projActive = await getOrInsert('projects', { church_id: c, project_code: `PRJ-SANCT-${ctx.slug}` },
    { project_name: 'Sanctuary Renovation', project_type: 'construction', description: 'Roof repair and seating upgrade', target_amount: 800000, current_amount: 320000, status: 'active', priority: 'high', start_date: daysAgo(60), end_date: daysAhead(120), assigned_to: ctx.pastorId, fund_id: funds['BF-001'], is_active: true, created_by: ctx.pastorId });
  const projDone = await getOrInsert('projects', { church_id: c, project_code: `PRJ-SOUND-${ctx.slug}` },
    { project_name: 'Sound System Upgrade', project_type: 'equipment', description: 'New PA and mixer', target_amount: 150000, current_amount: 150000, status: 'completed', priority: 'medium', start_date: daysAgo(200), end_date: daysAgo(30), is_active: true, created_by: ctx.pastorId });
  await getOrInsert('projects', { church_id: c, project_code: `PRJ-OUTREACH-${ctx.slug}` },
    { project_name: 'Community Outreach Van', project_type: 'outreach', description: 'Vehicle for evangelism', target_amount: 1200000, current_amount: 0, status: 'planned', priority: 'low', start_date: daysAhead(90), is_active: true, created_by: ctx.pastorId });

  for (const [title, status, due] of [
    ['Roof materials procurement', 'completed', daysAgo(20)],
    ['Interior painting', 'in_progress', daysAhead(30)],
    ['Final inspection', 'pending', daysAhead(110)],
  ]) {
    await getOrInsert('project_milestones', { church_id: c, project_id: projActive, title },
      { status, due_date: due, completed_at: status === 'completed' ? daysAgo(15) : null });
  }
  await getOrInsert('project_contributions', { church_id: c, project_id: projActive, contributor_id: ctx.memberUserId },
    { amount: KES(5000), date: daysAgo(10), notes: 'First instalment', created_by: ctx.memberUserId });
  await getOrInsert('project_contributions', { church_id: c, project_id: projDone, contributor_id: ctx.treasurerId },
    { amount: KES(150000), date: daysAgo(40), notes: 'Final funding tranche', created_by: ctx.treasurerId });

  // --- fixed assets ---
  await getOrInsert('fixed_assets', { church_id: c, asset_name: 'Yamaha Mixer Console' },
    { asset_code: 'AST-001', asset_type: 'equipment', purchase_date: daysAgo(30), purchase_price: 150000, current_value: 140000, depreciation_method: 'straight_line', useful_life: 5, accumulated_depreciation: 10000, location: 'Sanctuary', status: 'active', vendor_id: vendor1, created_by: ctx.treasurerId });
  await getOrInsert('fixed_assets', { church_id: c, asset_name: 'Church Van (Retired)' },
    { asset_code: 'AST-002', asset_type: 'vehicle', purchase_date: daysAgo(2000), purchase_price: 900000, current_value: 100000, depreciation_method: 'straight_line', useful_life: 8, accumulated_depreciation: 800000, location: 'Parking', status: 'retired', disposal_date: daysAgo(10), disposal_amount: 100000, created_by: ctx.treasurerId });

  // --- budgets + items ---
  const budgetActive = await getOrInsert('budgets', { church_id: c, name: 'FY2026 Operating Budget' },
    { budget_code: 'BUD-2026', budget_name: 'FY2026 Operating Budget', budget_type: 'operating', fiscal_year: 2026, period: 'annual', start_date: '2026-01-01', end_date: '2026-12-31', budgeted_amount: 1200000, total_budgeted: 1200000, actual_amount: 450000, status: 'active', created_by: ctx.treasurerId, department_id: ctx.departmentId, fund_id: funds['GF-001'] });
  await getOrInsert('budgets', { church_id: c, name: 'FY2027 Draft Budget' },
    { budget_code: 'BUD-2027', budget_name: 'FY2027 Draft Budget', budget_type: 'operating', fiscal_year: 2027, period: 'annual', start_date: '2027-01-01', end_date: '2027-12-31', budgeted_amount: 1400000, total_budgeted: 1400000, status: 'draft', created_by: ctx.treasurerId });
  for (const [item, cat, amt] of [
    ['Utilities allocation', 'Utilities', 200000],
    ['Salaries allocation', 'Salaries', 700000],
    ['Supplies allocation', 'Supplies', 300000],
  ]) {
    await getOrInsert('budget_items', { church_id: c, budget_id: budgetActive, item_name: item },
      { category_name: cat, category_type: 'expense', amount: amt, budgeted_amount: amt, actual_amount: Math.round(amt * 0.35), description: item });
  }

  // --- journal entries (balanced double-entry) ---
  const je = await getOrInsert('journal_entries', { church_id: c, description: 'Tithe receipt posting [TEST]' },
    { entry_number: `JE-${ctx.slug}-001`, entry_date: daysAgo(7), reference_type: 'payment', status: 'posted', total_debits: 25000, total_credits: 25000, created_by: ctx.treasurerId, posted_by: ctx.treasurerId, posted_at: daysAgo(7) });
  await getOrInsert('journal_entry_lines', { church_id: c, journal_entry_id: je, line_number: 1 },
    { account_id: coa['1010'], debit_amount: 25000, credit_amount: 0, description: 'Bank deposit' });
  await getOrInsert('journal_entry_lines', { church_id: c, journal_entry_id: je, line_number: 2 },
    { account_id: coa['4000'], debit_amount: 0, credit_amount: 25000, description: 'Tithe income' });
  const jeDraft = await getOrInsert('journal_entries', { church_id: c, description: 'Utilities accrual [TEST]' },
    { entry_number: `JE-${ctx.slug}-002`, entry_date: daysAgo(2), status: 'draft', total_debits: 8000, total_credits: 8000, created_by: ctx.treasurerId });
  await getOrInsert('journal_entry_lines', { church_id: c, journal_entry_id: jeDraft, line_number: 1 },
    { account_id: coa['5000'], debit_amount: 8000, credit_amount: 0, description: 'Utilities expense' });
  await getOrInsert('journal_entry_lines', { church_id: c, journal_entry_id: jeDraft, line_number: 2 },
    { account_id: coa['2000'], debit_amount: 0, credit_amount: 8000, description: 'Payable to KPLC' });

  // --- bank reconciliation + items (stable match on notes, not timestamp) ---
  const recon = await getOrInsert('bank_reconciliations', { church_id: c, notes: 'October statement [TEST]' },
    { account_id: coa['1010'], reconciliation_date: daysAgo(3), statement_date: daysAgo(5), statement_balance: 525000, book_balance: 520000, difference: 5000, status: 'in_progress', created_by: ctx.treasurerId });
  await getOrInsert('reconciliation_items', { church_id: c, reconciliation_id: recon, description: 'Unpresented cheque [TEST]' },
    { item_type: 'outstanding_check', amount: 5000 });

  // --- expenses (every status) ---
  for (const [desc, amt, status, vendor] of [
    ['Electricity bill October', 8000, 'approved', vendor2],
    ['Office stationery', 3500, 'pending', vendor1],
    ['Cleaning supplies', 1200, 'rejected', vendor1],
  ]) {
    await getOrInsert('expenses', { church_id: c, description: `${desc} [TEST]` },
      { expense_number: `EXP-${ctx.slug}-${Math.abs(hash(desc)) % 10000}`, expense_date: daysAgo(6), amount: amt, status, vendor_id: vendor, account_id: coa['5000'], fund_id: funds['GF-001'], payment_method: 'bank_transfer', submitted_by: ctx.deptHeadId, approved_by: status === 'pending' ? null : ctx.treasurerId, approved_at: status === 'approved' ? daysAgo(4) : null, rejection_reason: status === 'rejected' ? 'Missing receipt attachment' : null });
  }

  // --- refunds (needs a real payment) ---
  if (ctx.paymentId) {
    await getOrInsert('refunds', { church_id: c, payment_id: ctx.paymentId },
      { amount: 500, reason: 'Duplicate M-Pesa payment', status: 'pending', initiated_by: ctx.memberUserId, processed_by: null });
  }

  // --- financial alerts ---
  await getOrInsert('financial_alerts', { church_id: c, title: 'Budget 60% consumed [TEST]' },
    { alert_type: 'budget_threshold', message: 'FY2026 operating budget has passed 60% utilisation', priority: 'warning', entity_type: 'budget', entity_id: budgetActive, threshold_value: 60, current_value: 63, is_resolved: false, created_by: ctx.treasurerId });
  await getOrInsert('financial_alerts', { church_id: c, title: 'Large expense flagged [TEST]' },
    { alert_type: 'large_transaction', message: 'Expense above KES 100,000 requires review', priority: 'high', entity_type: 'expense', is_resolved: true, resolved_at: daysAgo(2), resolved_by: ctx.treasurerId, resolution_notes: 'Verified with vendor invoice', created_by: ctx.treasurerId });

  // --- accounting export ---
  await getOrInsert('accounting_exports', { church_id: c, export_type: 'journal_entries', export_format: 'csv' },
    { date_range_start: daysAgo(90), date_range_end: daysAgo(1), record_count: 2, file_path: 'exports/journal-2026.csv', file_size: 1024, status: 'completed', created_by: ctx.treasurerId, completed_at: daysAgo(1) });

  // --- recurring payments ---
  await getOrInsert('recurring_payments', { church_id: c, recurring_number: `REC-${ctx.slug}-001` },
    { member_id: ctx.paymentMemberId || ctx.memberId, amount: 2000, frequency: 'monthly', start_date: daysAgo(90), next_payment_date: daysAhead(20), status: 'active', payment_method: 'mpesa', auto_charge: false, last_payment_date: daysAgo(10), total_paid: 6000, created_by: ctx.memberUserId });
  await getOrInsert('recurring_payments', { church_id: c, recurring_number: `REC-${ctx.slug}-002` },
    { member_id: ctx.memberId, project_id: projActive, amount: 500, frequency: 'weekly', start_date: daysAgo(30), end_date: daysAhead(60), next_payment_date: daysAhead(5), status: 'paused', payment_method: 'cash', auto_charge: false, notes: 'Building fund pledge', created_by: ctx.memberUserId });

  // --- pledges ---
  const campaign = await getOrInsert('pledge_campaigns', { church_id: c, name: 'Building Fund Drive 2026 [TEST]' },
    { description: 'Sanctuary renovation pledges', target_amount: 800000, start_date: daysAgo(60), end_date: daysAhead(100), status: 'active', created_by: ctx.pastorId });
  const pledge1 = await getOrInsert('pledges', { church_id: c, member_id: ctx.memberId, pledge_type: 'building_fund' },
    { amount: 20000, amount_paid: 8000, frequency: 'monthly', start_date: daysAgo(50), end_date: daysAhead(100), status: 'active' });
  await getOrInsert('pledges', { church_id: c, member_id: ctx.memberId, pledge_type: 'campaign' },
    { amount: 5000, amount_paid: 5000, frequency: 'one_time', start_date: daysAgo(40), end_date: daysAgo(40), status: 'fulfilled' });
  if (ctx.paymentId) {
    await getOrInsert('pledge_payments', { pledge_id: pledge1, payment_id: ctx.paymentId },
      { amount: 4000 });
  }

  // --- contributions (church + member + fund + project coverage) ---
  for (const [type, amt, project] of [['tithe', 3000, null], ['offering', 800, null], ['project', 5000, projActive]]) {
    await getOrInsert('contributions', { church_id: c, member_id: ctx.memberId, contribution_type: type },
      { amount: amt, contribution_date: daysAgo(7), fund_id: funds['GF-001'], project_id: project, payment_id: ctx.paymentId, notes: `${type} seed`, created_by: ctx.treasurerId });
  }

  // --- payment_items (line items on existing payments) ---
  if (ctx.paymentId) {
    await getOrInsert('payment_items', { payment_id: ctx.paymentId, amount: 2000 },
      {});
    await getOrInsert('payment_items', { payment_id: ctx.paymentId, amount: 500 },
      {});
  }

  // --- event collections + contributions ---
  if (ctx.eventId) {
    const colOpen = await getOrInsert('event_collections', { church_id: c, title: 'Camp Meeting Offering [TEST]' },
      { description: 'Special offering during camp meeting', target_amount: 50000, current_amount: 12500, event_id: ctx.eventId, visibility: 'public', status: 'open', created_by: ctx.pastorId });
    const colClosed = await getOrInsert('event_collections', { church_id: c, title: 'Thanksgiving Drive [TEST]' },
      { description: 'Closed thanksgiving collection', target_amount: 30000, current_amount: 30000, event_id: ctx.eventId, visibility: 'members', status: 'closed', created_by: ctx.pastorId });
    for (const [col, amt] of [[colOpen, 5000], [colOpen, 7500], [colClosed, 30000]]) {
      await getOrInsert('collection_contributions', { church_id: c, collection_id: col, contributor_id: ctx.memberUserId, amount: amt },
        {});
    }
  }

  // --- personal collections + program contributions ---
  for (const [cat, amt, status] of [['tithe', 1500, 'completed'], ['offering', 300, 'pending']]) {
    await getOrInsert('personal_collections', { church_id: c, user_id: ctx.memberUserId, category: cat },
      { amount: amt, date: daysAgo(7), status });
  }
  for (const amt of [1000, 2500]) {
    await getOrInsert('program_contributions', { church_id: c, user_id: ctx.memberUserId, amount: amt },
      { program_id: null, event_id: ctx.eventId, method: 'mpesa', note: 'Program support' });
  }
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

async function seedSms(ctx) {
  const c = ctx.churchId;
  const org = await getOrInsert('sms_organizations', { church_id: c, slug: `${ctx.slug}-sms` },
    { name: `${ctx.slug} SMS Org`, api_key: `key-${ctx.slug}-${crypto.randomBytes(8).toString('hex')}`, is_active: true });

  const grpAll = await getOrInsert('sms_groups', { church_id: c, organization_id: org, name: 'All Members [TEST]' },
    { description: 'Every active member', source: 'website', contact_count: 3 });
  const grpLeaders = await getOrInsert('sms_groups', { church_id: c, organization_id: org, name: 'Leaders [TEST]' },
    { description: 'Department heads and elders', source: 'manual', contact_count: 1 });

  const contacts = [
    ['Mary Atieno', '+254711000101', 'active', grpAll],
    ['John Kiprop', '+254711000102', 'active', grpAll],
    ['Sarah Njeri', '+254711000103', 'active', grpAll],
    ['Peter Odhiambo', '+254711000104', 'opted_out', grpLeaders],
  ];
  const contactIds = [];
  for (const [name, phone, status, grp] of contacts) {
    contactIds.push(await getOrInsert('sms_contacts', { church_id: c, organization_id: org, phone },
      { name, email: `${name.split(' ')[0].toLowerCase()}@example.co.ke`, group_id: grp, source: 'manual', status, metadata: JSON.stringify({ seeded: true }) }));
  }

  for (const [name, cat, fav] of [['Sabbath Reminder [TEST]', 'reminder', true], ['Announcement Blast [TEST]', 'announcement', false], ['Thank You Note [TEST]', 'thank_you', false]]) {
    await getOrInsert('message_templates', { church_id: c, organization_id: org, name },
      { content: `Template body for ${name}`, category: cat, is_favorite: fav, created_by: ctx.pastorId });
  }

  await getOrInsert('import_logs', { church_id: c, organization_id: org, file_name: 'contacts-oct.csv' },
    { import_type: 'contacts', total_rows: 50, imported_count: 47, failed_count: 3, errors: JSON.stringify([{ row: 12, error: 'invalid phone' }]), created_by: ctx.pastorId });
  await getOrInsert('sync_status', { church_id: c, organization_id: org },
    { last_sync_time: daysAgo(1), sync_in_progress: false, pending_contact_changes: 0, pending_message_changes: 0 });

  const snap = Buffer.from(JSON.stringify({ contacts: 4, groups: 2, seeded: true }));
  await getOrInsert('sms_daily_snapshots', { church_id: c, snapshot_date: daysAgo(1) },
    { data_hash: crypto.createHash('sha256').update(snap).digest('hex'), compressed_data: snap, file_size: snap.length });
  await getOrInsert('sms_rolling_updates', { church_id: c, sequence_number: 1 },
    { update_type: 'contact', entity_type: 'sms_contacts', entity_id: contactIds[0], operation: 'update', data: JSON.stringify({ name: 'Mary Atieno' }) });

  await getOrInsert('user_group_permissions', { user_id: ctx.deptHeadId, group_id: grpLeaders },
    { can_view: true, can_send: true });
}

async function seedGallery(ctx) {
  const c = ctx.churchId;
  const albumPublic = await getOrInsert('gallery_albums', { church_id: c, title: 'Sabbath Service Highlights [TEST]' },
    { description: 'Photos from recent Sabbaths', created_by: ctx.pastorId, church_slug: ctx.slug, is_private: false, order_index: 1 });
  const albumPrivate = await getOrInsert('gallery_albums', { church_id: c, title: 'Leaders Retreat [TEST]' },
    { description: 'Internal leadership retreat', created_by: ctx.pastorId, church_slug: ctx.slug, is_private: true, order_index: 2 });

  const photoFiles = Object.keys(PNGS);
  const photos = [];
  const meta = [
    ['Worship moment', 'approved', true, 'service'],
    ['Choir practice', 'approved', false, 'service'],
    ['Baptism ceremony', 'approved', true, 'sacrament'],
    ['Youth hike', 'approved', false, 'youth'],
    ['Kitchen duty', 'pending', false, 'community'],
    ['Grounds cleanup', 'rejected', false, 'community'],
  ];
  for (let i = 0; i < meta.length; i++) {
    const [title, status, featured, cat] = meta[i];
    const album = i < 4 ? albumPublic : albumPrivate;
    photos.push(await getOrInsert('gallery_photos', { church_id: c, title: `${title} [TEST]` },
      {
        album_id: album, file_url: `/uploads/gallery/${photoFiles[i % photoFiles.length]}`,
        thumbnail_url: `/uploads/gallery/${photoFiles[i % photoFiles.length]}`,
        file_size: 95, file_type: 'image/png', width: 1, height: 1,
        uploaded_by: ctx.memberUserId, is_featured: featured, order_index: i,
        caption: `${title} — seeded`, category: cat, status,
      }));
  }

  const tagWorship = await getOrInsert('gallery_tags', { church_id: c, slug: `worship-${ctx.slug}` }, { name: `worship-${ctx.slug}` });
  const tagYouth = await getOrInsert('gallery_tags', { church_id: c, slug: `youth-${ctx.slug}` }, { name: `youth-${ctx.slug}` });
  await getOrInsert('gallery_photo_tags', { photo_id: photos[0], tag_id: tagWorship }, {});
  await getOrInsert('gallery_photo_tags', { photo_id: photos[3], tag_id: tagYouth }, {});

  const ptag = await getOrInsert('photo_tags', { church_id: c, name: `baptism-${ctx.slug}` }, {});
  await getOrInsert('photo_tag_assignments', { photo_id: photos[2], tag_id: ptag }, {});

  await getOrInsert('gallery_comments', { church_id: c, photo_id: photos[0], user_id: ctx.memberUserId },
    { comment: 'Beautiful service!' });
  await getOrInsert('gallery_comments', { church_id: c, photo_id: photos[0], user_id: ctx.pastorId },
    { comment: 'Please tag the choir members' });
  await getOrInsert('gallery_favorites', { user_id: ctx.memberUserId, photo_id: photos[0] }, {});
  await getOrInsert('gallery_photo_views', { photo_id: photos[0], user_id: ctx.memberUserId }, { viewed_at: daysAgo(2) });
  await getOrInsert('gallery_photo_downloads', { photo_id: photos[2], user_id: ctx.memberUserId }, { downloaded_at: daysAgo(1) });
  await getOrInsert('gallery_photo_shares', { photo_id: photos[0], user_id: ctx.memberUserId },
    { platform: 'whatsapp', recipient: '+254711000101', shared_at: daysAgo(1) });
  await getOrInsert('gallery_photo_labels', { user_id: ctx.memberUserId, photo_id: photos[0], label: 'choir' }, {});
  await getOrInsert('gallery_sync_status', { photo_id: photos[0] },
    { sync_status: 'pending' });

  // cover photo backfill
  await pool.query('UPDATE gallery_albums SET cover_photo_id = $1 WHERE id = $2 AND cover_photo_id IS NULL', [photos[0], albumPublic]);
}

async function seedDepartments(ctx) {
  const c = ctx.churchId;
  const d = ctx.departmentId;
  if (!d) return;

  // features (church-scoped catalog) + a setting on the dept
  const featAttendance = await getOrInsert('department_features', { church_id: c, slug: `attendance-tracker-${ctx.slug}` },
    { name: 'Attendance Tracker', description: 'Track meeting attendance', category: 'operations', is_active: true });
  const featReports = await getOrInsert('department_features', { church_id: c, slug: `monthly-reports-${ctx.slug}` },
    { name: 'Monthly Reports', description: 'Submit monthly activity reports', category: 'reporting', is_active: true });
  await getOrInsert('department_feature_settings', { church_id: c, department_id: d, feature_id: featAttendance },
    { is_enabled: true, config: JSON.stringify({ require_notes: true }) });

  // programs
  await getOrInsert('department_programs', { church_id: c, department_id: d, name: 'Weekly Bible Study [TEST]' },
    { description: 'Mid-week study', status: 'active', start_date: daysAgo(90), budget_target: 20000, created_by: ctx.deptHeadId });
  await getOrInsert('department_programs', { church_id: c, department_id: d, name: 'Year-End Banquet [TEST]' },
    { description: 'December celebration', status: 'planned', start_date: daysAhead(45), end_date: daysAhead(46), budget_target: 150000, created_by: ctx.deptHeadId });

  // subcommittees + members
  const sub = await getOrInsert('department_subcommittees', { church_id: c, department_id: d, name: 'Planning Committee [TEST]' },
    { description: 'Program planning team', lead_user_id: ctx.deptHeadId, is_active: true });
  await getOrInsert('subcommittee_members', { subcommittee_id: sub, user_id: ctx.memberUserId },
    { role_in_subcommittee: 'secretary', is_active: true });

  // meetings + attendees
  const mtg = await getOrInsert('department_meetings', { department_id: d, title: 'October Planning Meeting [TEST]' },
    { organizer_id: ctx.deptHeadId, description: 'Q4 program planning', meeting_date: daysAgo(10), duration: 90, location: 'Church hall', status: 'completed' });
  await getOrInsert('department_meetings', { department_id: d, title: 'November Planning Meeting [TEST]' },
    { organizer_id: ctx.deptHeadId, description: 'Next month planning', meeting_date: daysAhead(15), duration: 90, location: 'Church hall', status: 'scheduled' });
  // member_id FKs to users.id here (not members.id)
  await getOrInsert('department_meeting_attendees', { meeting_id: mtg, member_id: ctx.memberUserId },
    { status: 'attended' });

  // tasks — all statuses
  for (const [title, status, prio] of [
    ['Prepare November agenda [TEST]', 'pending', 'high'],
    ['Order communion supplies [TEST]', 'in_progress', 'medium'],
    ['Submit Q3 report [TEST]', 'completed', 'medium'],
  ]) {
    await getOrInsert('department_tasks', { department_id: d, title },
      { assigned_to: ctx.memberUserId, assigned_by: ctx.deptHeadId, status, priority: prio, due_date: daysAhead(7), description: title });
  }

  // global tasks table too (dashboard /tasks reads it)
  for (const [title, status] of [['Church-wide task [TEST]', 'todo'], ['Done task [TEST]', 'done']]) {
    await getOrInsert('tasks', { church_id: c, title },
      { department_id: d, status, priority: 'medium', assigned_to: ctx.memberUserId, due_date: daysAhead(7), created_by: ctx.deptHeadId });
  }

  // communications
  for (const [title, type, prio] of [['Meeting minutes [TEST]', 'announcement', 'normal'], ['Urgent: venue change [TEST]', 'alert', 'high']]) {
    await getOrInsert('department_communications', { department_id: d, title },
      { sender_id: ctx.deptHeadId, message: `${title} body text`, type, priority: prio, sent_at: daysAgo(3) });
  }

  // member↔department messaging thread
  if (ctx.memberId) {
    const thread = await getOrInsert('department_message_threads', { department_id: d, member_id: ctx.memberId },
      { church_id: c });
    await getOrInsert('department_messages', { thread_id: thread, department_id: d, sender_id: ctx.memberUserId, body: 'Question about volunteering [TEST]' },
      { church_id: c, label: 'sent', is_read: true });
    await getOrInsert('department_messages', { thread_id: thread, department_id: d, sender_id: ctx.deptHeadId, body: 'Reply: training is on Tuesday [TEST]' },
      { church_id: c, label: 'inbox', is_read: false });
  }

  // resources, settings, permissions, budgets, activity
  await getOrInsert('department_resources', { department_id: d, title: 'Dept Handbook [TEST]' },
    { uploaded_by: ctx.deptHeadId, file_path: 'uploads/resources/seed-handbook.pdf', file_type: 'application/pdf', file_size: MINIMAL_PDF.length, description: 'Handbook for coordinators' });
  await getOrInsert('department_settings', { department_id: d, setting_key: 'meeting_reminder_hours' }, { setting_value: '24' });
  await getOrInsert('department_settings', { department_id: d, setting_key: 'allow_member_uploads' }, { setting_value: 'true' });
  await getOrInsert('department_permissions', { department_id: d, user_id: ctx.memberUserId, permission: 'view_reports' }, { granted: true });
  await getOrInsert('department_budgets', { department_id: d, church_id: c, fiscal_year: 2026 },
    { total_amount: 200000, spent_amount: 75000, remaining_amount: 125000 });
  for (const action of ['created_meeting', 'assigned_task', 'updated_settings']) {
    await getOrInsert('department_activity', { department_id: d, user_id: ctx.deptHeadId, action },
      { details: JSON.stringify({ seeded: true }) });
  }

  // component allocation (department_components is global, already populated)
  const comp = await one(`SELECT id FROM department_components WHERE is_active IS NOT FALSE LIMIT 1`);
  if (comp) {
    await getOrInsert('department_component_allocations', { component_id: comp.id, department_id: d },
      { granted_by: ctx.pastorId });
  }
}

async function seedDocumentsApprovals(ctx) {
  const c = ctx.churchId;

  const doc1 = await getOrInsert('documents', { church_id: c, name: 'Church Constitution 2026 [TEST].pdf' },
    { description: 'Current constitution', file_path: 'uploads/documents/seed-constitution.pdf', file_url: '/uploads/documents/seed-constitution.pdf', size: MINIMAL_PDF.length, category: 'policies', uploaded_by: ctx.pastorId, is_active: true, approval_status: 'approved' });
  const doc2 = await getOrInsert('documents', { church_id: c, name: 'Budget Proposal Draft [TEST].pdf' },
    { description: 'Pending approval draft', file_path: 'uploads/documents/seed-constitution.pdf', file_url: '/uploads/documents/seed-constitution.pdf', size: MINIMAL_PDF.length, category: 'finance', uploaded_by: ctx.treasurerId, is_active: true, approval_status: 'pending' });

  await getOrInsert('document_versions', { document_id: doc1, version_number: 1 },
    { file_content: MINIMAL_PDF, file_size: MINIMAL_PDF.length, change_summary: 'Initial version', created_by: ctx.pastorId });
  await getOrInsert('document_permissions', { document_id: doc2, user_id: ctx.deptHeadId },
    { permission: 'view' });

  // approval_requests — cover every status for this church
  const arPending = await getOrInsert('approval_requests', { church_id: c, title: 'Document approval: Budget Draft [TEST]' },
    { entity_type: 'document', entity_id: String(doc2), requester_id: ctx.treasurerId, status: 'pending', request_type: 'document', module: 'documents', priority: 'normal', department_id: ctx.departmentId, request_data: JSON.stringify({ documentId: doc2 }), requested_at: daysAgo(1) });
  const arApproved = await getOrInsert('approval_requests', { church_id: c, title: 'Document approval: Constitution [TEST]' },
    { entity_type: 'document', entity_id: String(doc1), requester_id: ctx.pastorId, status: 'approved', request_type: 'document', module: 'documents', priority: 'normal', approved_by: ctx.pastorId, approver_id: ctx.pastorId, approved_at: daysAgo(5), requested_at: daysAgo(6) });
  await getOrInsert('approval_requests', { church_id: c, title: 'Expense approval: Catering [TEST]' },
    { entity_type: 'expense', entity_id: '0', requester_id: ctx.deptHeadId, status: 'rejected', request_type: 'expense', module: 'treasury', priority: 'high', amount: 15000, rejected_by: ctx.treasurerId, rejected_at: daysAgo(3), requested_at: daysAgo(4), comments: 'Over budget' });

  // history for both
  for (const [ar, action, user] of [
    [arPending, 'submitted', ctx.treasurerId],
    [arApproved, 'submitted', ctx.pastorId],
    [arApproved, 'approved', ctx.pastorId],
  ]) {
    await getOrInsert('approval_history', { approval_id: ar, action, user_id: user },
      { comment: null });
  }

  // document_approvals + workflow_assignments join rows
  await getOrInsert('document_approvals', { approval_request_id: arApproved, approver_id: ctx.pastorId },
    { comments: 'Approved per board decision', approved_at: daysAgo(5) });
  await getOrInsert('workflow_assignments', { approval_id: arPending, step_index: 0, approver_id: ctx.pastorId },
    { status: 'pending', assigned_at: daysAgo(1) });
}

async function seedContentChat(ctx) {
  const c = ctx.churchId;

  const catNews = await getOrInsert('content_categories', { church_id: c, slug: `news-${ctx.slug}` }, { name: 'News', sort_order: 1 });
  await getOrInsert('content_categories', { church_id: c, slug: `sermons-${ctx.slug}` }, { name: 'Sermons', sort_order: 2 });
  const tagFeatured = await getOrInsert('content_tags', { church_id: c, slug: `featured-${ctx.slug}` }, { name: 'featured' });
  await getOrInsert('content_tags', { church_id: c, slug: `youth-${ctx.slug}` }, { name: 'youth' });

  const itemPub = await getOrInsert('content_items', { church_id: c, slug: `harvest-sabbath-recap-${ctx.slug}` },
    { title: 'Harvest Sabbath Recap [TEST]', content: 'Summary of the harvest Sabbath program.', content_type: 'article', category_id: catNews, author_id: ctx.pastorId, status: 'published', published_at: daysAgo(7), priority: 1, seo_title: 'Harvest Sabbath', seo_description: 'Recap' });
  const itemDraft = await getOrInsert('content_items', { church_id: c, slug: `december-outreach-plan-${ctx.slug}` },
    { title: 'December Outreach Plan [TEST]', content: 'Draft plan for December evangelism.', content_type: 'article', category_id: catNews, author_id: ctx.pastorId, status: 'draft', priority: 0 });

  await getOrInsert('content_item_tags', { content_item_id: itemPub, tag_id: tagFeatured }, {});
  await getOrInsert('content_revisions', { content_item_id: itemPub, revision_number: 1 },
    { title: 'Harvest Sabbath Recap [TEST]', content: 'First draft', author_id: ctx.pastorId, change_summary: 'Initial draft' });
  await getOrInsert('content_locks', { content_item_id: itemDraft, user_id: ctx.pastorId },
    { expires_at: daysAhead(0.02) });

  // comments (announcement + event + photo entity coverage)
  for (const [etype, eid] of [['announcement', '1'], ['event', String(ctx.eventId || 1)], ['photo', '1']]) {
    await getOrInsert('comments', { church_id: c, entity_type: etype, entity_id: eid, user_id: ctx.memberUserId },
      { content: `Comment on ${etype} [TEST]`, type: 'comment' });
  }

  // chat rooms + messages
  const roomGeneral = await getOrInsert('chat_rooms', { church_id: c, name: 'General [TEST]' },
    { description: 'Whole-church chat', room_type: 'public', created_by: ctx.pastorId });
  const roomLeaders = await getOrInsert('chat_rooms', { church_id: c, name: 'Leaders [TEST]' },
    { description: 'Leadership coordination', room_type: 'private', created_by: ctx.pastorId });
  const msgs = [
    [roomGeneral, ctx.memberUserId, 'Good morning church family!'],
    [roomGeneral, ctx.pastorId, 'Reminder: Sabbath school starts 9am'],
    [roomLeaders, ctx.deptHeadId, 'Budget meeting moved to Thursday'],
    [roomLeaders, ctx.pastorId, 'Confirmed, see you then'],
  ];
  for (const [room, sender, content] of msgs) {
    await getOrInsert('chat_messages', { room_id: room, sender_id: sender, content },
      { message_type: 'text', metadata: '{}' });
  }
}

async function seedMembers(ctx) {
  const c = ctx.churchId;
  if (!ctx.memberId) return;
  for (const [type, days] of [['profile_update', 14], ['payment', 7], ['login', 1]]) {
    await getOrInsert('member_activities', { church_id: c, member_id: ctx.memberId, activity_type: type },
      { description: `${type} event [TEST]`, activity_date: daysAgo(days) });
  }
  for (const [days, attended] of [[7, true], [14, true], [21, false]]) {
    // match on attended+notes, not attendance_date — a per-run timestamp in the
    // match key can never equal the stored date, so it re-inserts every run
    const notes = attended ? 'Present' : 'Absent - travelled';
    await getOrInsert('member_attendance', { church_id: c, member_id: ctx.memberId, attended, notes },
      { attendance_date: daysAgo(days), event_id: ctx.eventId });
  }
}

async function seedReports(ctx) {
  const c = ctx.churchId;
  const rep = await getOrInsert('reports', { church_id: c, name: 'October Financial Report [TEST]' },
    { description: 'Monthly financial summary', report_type: 'financial', data_source: 'treasury', parameters: JSON.stringify({ date_range: { start: '2026-10-01', end: '2026-10-31' }, row_count: 2 }), format: 'json', created_by: ctx.treasurerId });
  await getOrInsert('saved_reports', { church_id: c, name: 'Tithes vs Offerings [TEST]' },
    { description: 'Income split analysis', data_source: 'payments', filters: JSON.stringify({ period: 'monthly' }), columns: JSON.stringify(['date', 'type', 'amount']), format: 'csv', is_public: false, created_by: ctx.treasurerId });
  const sched = await getOrInsert('scheduled_reports', { church_id: c, name: 'Weekly Tithe Digest [TEST]' },
    { description: 'Auto email to treasurer', schedule_config: JSON.stringify({ frequency: 'weekly', day: 'monday', hour: 8 }), report_config: JSON.stringify({ report_type: 'financial', format: 'csv' }), recipients: JSON.stringify(['treasurer@church.org']), is_active: true, created_by: ctx.treasurerId });
  await getOrInsert('report_executions', { church_id: c, report_id: sched },
    { filename: 'weekly-tithe-2026-10-27.csv', status: 'completed', executed_at: daysAgo(3) });
}

async function seedTelegram(ctx) {
  const c = ctx.churchId;
  const chan = await getOrInsert('telegram_channels', { church_id: c, channel_id: `-100${Math.abs(hash(ctx.slug)) % 1000000}` },
    { channel_name: `${ctx.slug} Announcements`, channel_username: `${ctx.slug.replace(/-/g, '')}_ch`, requires_2fa: false, auto_sync_to_announcements: true, sync_interval_hours: 1, is_active: true, last_sync_at: daysAgo(1), mtproto_auth_status: 'authenticated' });

  const post = await getOrInsert('telegram_posts', { channel_id: chan, message_id: 1001 },
    { message_text: 'Sabbath blessings! Service starts 9am [TEST]', media_type: 'text', posted_at: daysAgo(2) });
  await getOrInsert('telegram_channel_posts', { channel_id: chan, message_id: 1001 },
    { message_text: 'Sabbath blessings! Service starts 9am [TEST]', post_date: daysAgo(2), is_edited: false, synced_to_announcement: true });
  await getOrInsert('telegram_post_views', { channel_id: chan, post_id: post },
    { views: 245, recorded_at: daysAgo(1) });
  await getOrInsert('telegram_auth_methods', { church_id: c, type: 'bot', name: 'Announcements Bot [TEST]' },
    { config: JSON.stringify({ bot_username: 'kmain_bot' }), is_active: true, is_default: true });

  // cache row for a gallery photo pushed to the channel
  const photo = await one(`SELECT id FROM gallery_photos WHERE church_id = $1 LIMIT 1`, [c]);
  if (photo) {
    await getOrInsert('telegram_photos_cache', { church_id: c, photo_id: photo.id },
      { telegram_file_id: `tgfile-${ctx.short}-001`, telegram_file_unique_id: `tguniq-${ctx.short}-001`, cached_url: `https://api.telegram.org/file/seed-${ctx.short}.jpg`, cached_at: daysAgo(1), expires_at: daysAhead(1), is_valid: true });
  }
}

async function seedSystem(ctx) {
  const c = ctx.churchId;

  await getOrInsert('security_settings', { church_id: c },
    { password_policy: JSON.stringify({ min_length: 8, require_mixed: true }), session_timeout: 3600, mfa_enabled: false, ip_whitelist: JSON.stringify([]), ip_blacklist: JSON.stringify([]), settings: JSON.stringify({ lockout_attempts: 5 }) });

  // logs — enough variation for the admin log pages to render
  for (const [action, table] of [['update', 'users'], ['insert', 'payments'], ['delete', 'departments']]) {
    await getOrInsert('audit_log', { church_id: c, user_id: ctx.pastorId, action, table_name: table },
      { record_id: '00000000-0000-0000-0000-000000000001', new_values: JSON.stringify({ seeded: true }), ip_address: '127.0.0.1', user_agent: 'seed-script' });
  }
  for (const action of ['login', 'login_failed', 'password_change']) {
    await getOrInsert('auth_audit_log', { church_id: c, user_id: ctx.memberUserId, action },
      { details: JSON.stringify({ seeded: true }), ip_address: '127.0.0.1', user_agent: 'seed-script' });
  }
  for (const key of ['site_title', 'palette']) {
    await getOrInsert('settings_audit_log', { setting_key: key, changed_by: ctx.pastorId },
      { old_value: 'old', new_value: 'new' });
  }
  let attemptIdx = 0;
  for (const [success, days] of [[true, 1], [false, 1], [true, 0]]) {
    // ip_address varies per row so the match key is stable across re-runs
    await getOrInsert('login_attempts', { church_id: c, email: `member@${ctx.slug}.com`, success, ip_address: `10.0.0.${++attemptIdx}` },
      { attempted_at: daysAgo(days), user_agent: 'Mozilla/5.0 (seed)' });
  }
  for (const [method, p, code] of [['GET', '/api/payments', 200], ['POST', '/api/auth/login', 401], ['GET', '/api/members', 200]]) {
    await getOrInsert('api_logs', { user_id: ctx.memberUserId, method, path: p, status_code: code },
      { ip: '127.0.0.1' });
  }

  // token tables — realistic expired/used rows only (never live credentials)
  await getOrInsert('password_reset_tokens', { church_id: c, user_id: ctx.memberUserId, token: `expired-${ctx.slug}` },
    { expires_at: daysAgo(1), used: true });
  await getOrInsert('refresh_tokens', { church_id: c, user_id: ctx.memberUserId, token: `expired-${ctx.slug}` },
    { expires_at: daysAgo(1), used: true });
}

async function seedPlatform() {
  // Platform-level (no church_id)
  for (const [svc, status, rt] of [['api', 'healthy', 45], ['database', 'healthy', 12], ['redis', 'degraded', 320], ['sms_gateway', 'healthy', 890]]) {
    await getOrInsert('platform_health', { service_name: svc },
      { status, response_time: rt, error_rate: status === 'degraded' ? 2.5 : 0, last_check: daysAgo(0.01), metadata: JSON.stringify({ seeded: true }) });
  }
  for (const [type, sev, msg, status] of [
    ['uptime', 'high', 'Redis latency above threshold [TEST]', 'active'],
    ['security', 'low', 'Quarterly key rotation due [TEST]', 'resolved'],
  ]) {
    await getOrInsert('platform_alerts', { alert_type: type, message: msg },
      { severity: sev, service_affected: type === 'uptime' ? 'redis' : 'api', status, resolved_at: status === 'resolved' ? daysAgo(2) : null, resolution_notes: status === 'resolved' ? 'Rotated' : null });
  }
  const puser = await one('SELECT id FROM platform_users LIMIT 1');
  if (puser) {
    for (const action of ['login', 'view_church', 'update_setting']) {
      await getOrInsert('platform_audit_logs', { user_id: puser.id, action },
        { resource_type: 'church', resource_id: 1, details: JSON.stringify({ seeded: true }), ip_address: '127.0.0.1' });
    }
  }
  const admin = await one('SELECT id FROM users LIMIT 1');
  for (const [type, status] of [['full', 'completed'], ['incremental', 'completed']]) {
    await getOrInsert('backup_logs', { backup_type: type, file_path: `backups/${type}-seed.dump` },
      { status, started_at: daysAgo(3), completed_at: daysAgo(3), created_by: admin?.id });
  }
  await getOrInsert('maintenance_schedules', { message: 'Planned database maintenance [TEST]' },
    { scheduled_at: daysAhead(14), duration: 60, created_by: admin?.id });

  // website_settings — key_name is the PK (global table, one row per key)
  for (const [key, value, type, cat] of [
    ['site_title', 'Msabato Church Platform', 'string', 'general'],
    ['youtube_stream_url', 'https://youtube.com/live/example', 'string', 'streaming'],
    ['enable_live_stream', 'false', 'boolean', 'streaming'],
    ['contact_phone', '+254700000000', 'string', 'contact'],
  ]) {
    await getOrInsert('website_settings', { key_name: key },
      { value, value_type: type, category: cat, description: `Seeded ${key}`, church_id: null });
  }
}

async function seedSmsTemplatesGlobal(ctx) {
  // sms_templates is a GLOBAL table (no church_id)
  const t1 = await getOrInsert('sms_templates', { name: 'Sabbath Greeting [TEST]' },
    { content: 'Happy Sabbath {{name}}!', template_type: 'greeting' });
  const t2 = await getOrInsert('sms_templates', { name: 'Event Invite [TEST]' },
    { content: 'You are invited to {{event}} on {{date}}', template_type: 'invitation' });
  await getOrInsert('sms_template_versions', { template_id: t1, version_number: 1 },
    { content: 'Happy Sabbath!', created_by: ctx.pastorId });
  await getOrInsert('sms_template_versions', { template_id: t1, version_number: 2 },
    { content: 'Happy Sabbath {{name}}!', created_by: ctx.pastorId });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding test permutations...');
  ensureUploads();
  await loadTableColumns();

  const churches = (await pool.query('SELECT id, name, slug FROM churches ORDER BY name')).rows;
  console.log(`${churches.length} churches: ${churches.map(c => c.slug).join(', ')}`);

  await seedPlatform();

  // sms_templates global seed needs one ctx for created_by — reuse first church's pastor
  const firstCtx = await buildContext(churches[0]);
  await seedSmsTemplatesGlobal(firstCtx);

  for (const church of churches) {
    const ctx = await buildContext(church);
    if (!ctx.memberUserId) {
      console.log(`  ! ${church.slug}: no users — skipping`);
      continue;
    }
    console.log(`  seeding ${church.slug}...`);
    await seedFinance(ctx);
    await seedSms(ctx);
    await seedGallery(ctx);
    await seedDepartments(ctx);
    await seedDocumentsApprovals(ctx);
    await seedContentChat(ctx);
    await seedMembers(ctx);
    await seedReports(ctx);
    await seedTelegram(ctx);
    await seedSystem(ctx);
  }

  console.log(`\nDone: ${inserted} rows inserted, ${skipped} already existed.`);
}

main()
  .then(() => pool.end())
  .catch(err => { console.error('SEED FAILED:', err); pool.end(); process.exit(1); });
