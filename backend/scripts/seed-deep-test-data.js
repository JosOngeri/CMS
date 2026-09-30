#!/usr/bin/env node
/**
 * Deep test-data seeder — fills every feature table with realistic,
 * multi-tenant data so dashboards and workflows can be exercised.
 *
 * Per .devin/rules/seed-data.md: every schema change must ship with data.
 *
 * Usage:
 *   node scripts/seed-deep-test-data.js            # skip tables that already have data
 *   node scripts/seed-deep-test-data.js --force    # seed regardless of row counts
 *   node scripts/seed-deep-test-data.js --only=member_obligations,remittances
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'cms_db',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
});

const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rAmt = (min, max) => Math.round((min + Math.random() * (max - min)) / 50) * 50;
const daysAgo = n => new Date(Date.now() - n * 864e5);
const daysAhead = n => new Date(Date.now() + n * 864e5);
const mpesaCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const d = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = pick(c.split(''));
  for (let i = 0; i < 9; i++) s += pick(d.split(''));
  return s;
};
const phone = () => `07${pick(['01','11','21','22','23','24','25','45','46','57','58','59','90','91','92'])}${String(ri(100000, 999999))}`;

const FIRST = ['Abel','Abigael','Alice','Arnold','Beatrice','Bonface','Caroline','Charles','Daniel','Diana','Edward','Elizabeth','Emmanuel','Esther','Faith','Felix','Florence','Francis','George','Grace','Henry','Isaac','Jane','Janet','John','Joseph','Joy','Judith','Julius','Kevin','Lilian','Lucy','Margaret','Mary','Mercy','Michael','Moses','Nancy','Naomi','Nathan','Nicholas','Oliver','Pamela','Patrick','Paul','Peter','Rachel','Rebecca','Robert','Rose','Samuel','Sarah','Simon','Stephen','Susan','Thomas','Vincent','William','Winnie','Zipporah'];
const LAST = ['Ongeri','Nyakundi','Mokaya','Amalemba','Mayaka','Onchari','Mboya','Otieno','Kiprop','Wanjiru','Kamau','Njoroge','Ochieng','Mwangi','Achieng','Kiptoo','Mutua','Wafula','Barasa','Nyambura','Gitau','Maina','Cherono','Rotich','Wafula','Odhiambo','Moraa','Kerubo','Nyagwoka','Omari'];
const kenyanName = () => `${pick(FIRST)} ${pick(LAST)}`;

async function count(t) {
  const r = await pool.query(`SELECT count(*)::int AS n FROM ${t}`);
  return r.rows[0].n;
}

// Each seeder: { table, min, run(ctx) } — skipped when table already has >= min rows.
const results = [];
async function seed(table, min, fn) {
  if (ONLY.length && !ONLY.includes(table)) return;
  const n = await count(table);
  if (!FORCE && n >= min) { results.push(`${table}: skipped (${n} rows already)`); return; }
  const before = n;
  await fn();
  const after = await count(table);
  results.push(`${table}: +${after - before} (now ${after})`);
}

async function q(sql, params) { return pool.query(sql, params); }

// ---------------------------------------------------------------------------
// Context: FK sources per church
// ---------------------------------------------------------------------------
async function buildContext() {
  const churches = (await q(`SELECT id, slug, name FROM churches ORDER BY name`)).rows;
  const ctx = { churches: [] };
  for (const c of churches) {
    const users = (await q(`SELECT u.id, u.first_name, u.last_name FROM users u WHERE u.church_id = $1 AND u.is_active = true`, [c.id])).rows;
    const leaders = (await q(`SELECT DISTINCT user_id FROM department_leadership WHERE church_id = $1 AND is_active = true`, [c.id])).rows.map(r => r.user_id);
    const depts = (await q(`SELECT id, name, parent_department_id FROM departments WHERE church_id = $1 AND is_active = true`, [c.id])).rows;
    const deptMembers = (await q(`SELECT department_id, user_id FROM department_members WHERE church_id = $1 AND is_active = true`, [c.id])).rows;
    const members = (await q(`SELECT id, user_id FROM members WHERE church_id = $1`, [c.id])).rows;
    const events = (await q(`SELECT id, title FROM events WHERE church_id = $1 ORDER BY event_date DESC LIMIT 30`, [c.id])).rows;
    const payments = (await q(`SELECT id, amount, member_id FROM payments WHERE church_id = $1 LIMIT 100`, [c.id])).rows;
    const photos = (await q(`SELECT id FROM gallery_photos WHERE church_id = $1`, [c.id])).rows;
    const coa = (await q(`SELECT id, account_code, account_type FROM chart_of_accounts WHERE is_active = true`, [])).rows;
    const admins = (await q(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.church_id=$1 AND r.name IN ('Super Admin','Pastor','Treasurer') LIMIT 5`, [c.id])).rows.map(r => r.id);
    ctx.churches.push({ ...c, users, leaders, depts, deptMembers, members, events, payments, photos, coa, admins });
  }
  const payCats = (await q(`SELECT id, name FROM payment_categories`)).rows;
  const telegramChannels = (await q(`SELECT id, church_id FROM telegram_channels`)).rows;
  const notifTypes = (await q(`SELECT id, name FROM notification_types`)).rows;
  const typeIds = {};
  for (const t of notifTypes) typeIds[t.name] = t.id;
  return { ...ctx, payCats, telegramChannels, notifTypes, typeIds };
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------
async function main() {
  const ctx = await buildContext();

  // ---- Treasury: accounts (treasury module reads `accounts`, not chart_of_accounts)
  await seed('accounts', 4, async () => {
    const types = [
      ['1000', 'Petty Cash', 'asset', 'cash'],
      ['1010', 'M-Pesa Till', 'asset', 'bank'],
      ['1020', 'Co-operative Bank - Main', 'asset', 'bank'],
      ['1100', 'Church Building Fund Account', 'asset', 'bank'],
      ['4000', 'Tithe Income', 'revenue', 'income'],
      ['4010', 'Offerings Income', 'revenue', 'income'],
      ['4020', 'Thanksgiving Income', 'revenue', 'income'],
      ['5000', 'Ministry Expenses', 'expense', 'expense'],
      ['5010', 'Utilities', 'expense', 'expense'],
      ['5020', 'Maintenance', 'expense', 'expense'],
    ];
    for (const ch of ctx.churches) {
      for (const [num, name, type, sub] of types) {
        await q(`INSERT INTO accounts (account_number, account_name, account_type, sub_type, description, church_id)
                 VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [`${num}-${ch.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`, `${name} — ${ch.name}`, type, sub, `${name} account for ${ch.name}`, ch.id]);
      }
    }
  });

  // ---- Treasury: journal entries + lines
  await seed('journal_entries', 10, async () => {
    for (const ch of ctx.churches) {
      const debits = ch.coa.filter(a => a.account_type === 'asset' || !a.account_type);
      const credits = ch.coa.filter(a => a.account_type === 'revenue' || !a.account_type);
      const accIds = ch.coa.map(a => a.id);
      if (accIds.length < 2) continue;
      for (let i = 0; i < 15; i++) {
        const amount = rAmt(2000, 45000);
        const je = await q(
          `INSERT INTO journal_entries (entry_number, entry_date, description, created_by, status)
           VALUES ($1,$2,$3,$4,'posted') RETURNING id`,
          [`JE-${ch.slug.slice(0, 4).toUpperCase()}-${Date.now() % 100000}-${i}`, daysAgo(ri(1, 90)),
           pick(['Weekly tithe collection deposit', 'Sabbath school offerings', 'Department transfer to main account', 'Utilities payment — Kenya Power', 'Communion service collection', 'Camp meeting registration fees', 'Building fund contributions']),
           pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id))]);
        const jeId = je.rows[0].id;
        const [a, b] = [pick(accIds), pick(accIds)];
        await q(`INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description) VALUES
                 ($1,$2,$3,0,$4), ($1,$5,0,$3,$4)`, [jeId, a, amount, 'Double-entry posting', b]);
      }
    }
  });

  // ---- Department budgets (drives obligations + collections UI)
  const PURPOSES = [
    ['Sabbath School Materials', 'Quarterly teaching materials and quarterlies', 'target'],
    ['Camp Meeting Fundraiser', 'Transport and meals for annual camp meeting', 'target'],
    ['Choir Uniforms', 'New robes and sashes for the choir', 'voluntary'],
    ['Community Outreach', 'Food basket program for Kiserian families', 'voluntary'],
    ['Youth Retreat', 'Weekend retreat at Lukenya', 'target'],
    ['Pathfinder Equipment', 'Camping gear and honor class materials', 'voluntary'],
    ['Church Anniversary Celebration', 'Venue, catering and guest speakers', 'target'],
    ['Welfare Fund', 'Support for bereaved and needy members', 'voluntary'],
  ];
  await seed('department_budgets', 20, async () => {
    for (const ch of ctx.churches) {
      for (const d of ch.depts) {
        const [purpose, desc, otype] = pick(PURPOSES);
        const target = rAmt(10000, 250000);
        const collected = rAmt(0, Math.round(target * 0.8));
        await q(
          `INSERT INTO department_budgets (department_id, church_id, purpose, target_amount, total_amount, spent_amount, remaining_amount,
             fiscal_year, status, collection_deadline, obligation_type, created_by)
           VALUES ($1,$2,$3,$4,$4,$5,$10,'2026',$6,$7,$8,$9)`,
          [d.id, ch.id, `${purpose} — ${d.name}`, target, collected,
           pick(['active', 'active', 'active', 'completed']),
           daysAhead(ri(14, 120)), otype, pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id)),
           target - collected]);
      }
    }
  });

  // ---- Member obligations (the dashboard hero + obligations page)
  await seed('member_obligations', 200, async () => {
    for (const ch of ctx.churches) {
      const budgets = (await q(
        `SELECT id, department_id, target_amount, obligation_type, collection_deadline FROM department_budgets WHERE church_id = $1`,
        [ch.id])).rows;
      for (const b of budgets) {
        const members = ch.deptMembers.filter(m => m.department_id === b.department_id);
        if (!members.length) continue;
        const per = Math.max(500, Math.round(b.target_amount / members.length / 50) * 50);
        for (const m of members) {
          const amount = b.obligation_type === 'voluntary' ? 0 : per;
          const paid = rAmt(0, amount);
          await q(
            `INSERT INTO member_obligations (church_id, department_id, budget_id, user_id, amount, obligation_type, paid_amount, status, due_date, allocated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [ch.id, b.department_id, b.id, m.user_id, amount,
             b.obligation_type || 'target', paid,
             paid >= amount ? 'fulfilled' : paid > 0 ? 'partial' : 'pending',
             b.collection_deadline, pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id))]);
        }
      }
    }
  });

  // ---- Subcommittees + members
  await seed('department_subcommittees', 5, async () => {
    const names = [['Planning Committee', 'Coordinates department programs and logistics'], ['Welfare Committee', 'Visitation and member care'], ['Finance Committee', 'Oversees departmental collections and spend'], ['Media Team', 'Photos, announcements and online presence']];
    for (const ch of ctx.churches) {
      for (const d of ch.depts.slice(0, 15)) {
        for (const [name, desc] of names.slice(0, ri(1, 3))) {
          await q(
            `INSERT INTO department_subcommittees (department_id, church_id, name, description, lead_user_id)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
            [d.id, ch.id, name, desc, pick(ch.users).id]);
        }
      }
    }
  });
  await seed('subcommittee_members', 10, async () => {
    const subs = (await q(`SELECT id, department_id, church_id FROM department_subcommittees`)).rows;
    for (const s of subs) {
      const ch = ctx.churches.find(c => c.id === s.church_id);
      if (!ch) continue;
      const members = ch.deptMembers.filter(m => m.department_id === s.department_id).slice(0, ri(3, 7));
      for (const m of members) {
        await q(`INSERT INTO subcommittee_members (subcommittee_id, user_id, role_in_subcommittee)
                 VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [s.id, m.user_id, pick(['Member', 'Member', 'Member', 'Secretary'])]);
      }
    }
  });

  // ---- Department programs + contributions
  await seed('department_programs', 10, async () => {
    const programs = ['Weekly Sabbath Service', 'Bible Study Series', 'Community Clean-up Day', 'Health Screening Drive', 'Door-to-Door Evangelism', 'Children Story Hour', 'Choir Practice Sessions', 'Prayer Breakfast'];
    for (const ch of ctx.churches) {
      for (const d of ch.depts.slice(0, 15)) {
        const name = pick(programs);
        await q(
          `INSERT INTO department_programs (department_id, church_id, name, description, status, start_date, end_date, budget_target, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [d.id, ch.id, `${name}`, `${name} organized by ${d.name}`, pick(['planned', 'active', 'completed']),
           daysAgo(ri(0, 30)), daysAhead(ri(14, 90)), rAmt(5000, 80000), pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id))]);
      }
    }
  });
  await seed('program_contributions', 50, async () => {
    const programs = (await q(`SELECT id, church_id FROM department_programs`)).rows;
    for (const p of programs) {
      const ch = ctx.churches.find(c => c.id === p.church_id);
      if (!ch) continue;
      for (let i = 0; i < ri(2, 6); i++) {
        await q(
          `INSERT INTO program_contributions (user_id, church_id, program_id, amount, method, note)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [pick(ch.users).id, ch.id, p.id, rAmt(200, 5000), pick(['mpesa', 'cash', 'bank']), pick(['Towards program target', 'Pledge fulfilment', 'Special offering'])]);
      }
    }
  });

  // ---- M-Pesa reconciliations (collector workflow)
  await seed('mpesa_reconciliations', 40, async () => {
    for (const ch of ctx.churches) {
      const obligations = (await q(`SELECT id, department_id, user_id, amount FROM member_obligations WHERE church_id = $1 LIMIT 40`, [ch.id])).rows;
      const collector = pick(ch.leaders.length ? ch.leaders : ch.users.map(u => u.id));
      for (let i = 0; i < 40; i++) {
        const status = i < 12 ? 'unassigned' : i < 30 ? 'reconciled' : 'remitted';
        const ob = status === 'unassigned' ? null : pick(obligations);
        await q(
          `INSERT INTO mpesa_reconciliations (church_id, department_id, obligation_id, tx_code, amount, payer_name, payer_phone, sms_timestamp, reconciled_by, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [ch.id, ob ? ob.department_id : pick(ch.depts).id, ob ? ob.id : null, mpesaCode(),
           rAmt(200, 15000), kenyanName(), phone(), daysAgo(ri(0, 21)), collector, status]);
      }
    }
  });

  // ---- Parser profiles (E2 — active ruleset per church + one dept-scoped)
  await seed('mpesa_parser_profiles', 4, async () => {
    const ruleset = JSON.stringify({
      version: 1,
      patterns: {
        transaction_code: '([A-Z0-9]{10})\\s+[Cc]onfirmed',
        amount: 'Ksh\\s?([\\d,]+\\.\\d{2})',
        payer_name: 'from\\s+([A-Z][A-Z\\s]+?)(?:\\s+\\d|\\s+on)',
      },
      sender_filter: 'MPESA',
      notes: 'Seeded church-level profile matching standard Safaricom confirmations',
    });
    for (const ch of ctx.churches) {
      const creator = ch.admins[0] || ch.users[0]?.id;
      await q(
        `INSERT INTO mpesa_parser_profiles (church_id, version, ruleset, sample_sms, status, created_by)
         VALUES ($1, 1, $2, $3, 'active', $4)`,
        [ch.id, ruleset, 'QK12AB34CD Confirmed. Ksh2,500.00 received from JOHN DOE 0722000111 on 12/1/26.', creator]);
      if (ch.depts.length) {
        await q(
          `INSERT INTO mpesa_parser_profiles (church_id, department_id, version, ruleset, sample_sms, status, created_by)
           VALUES ($1, $2, 1, $3, $4, 'active', $5)`,
          [ch.id, ch.depts[0].id, ruleset, 'Paybill 522533 Acc YOUTH Confirmed. Ksh1,000.00 from MARY WANJIRU.', creator]);
      }
    }
  });

  // ---- Remittances + items
  await seed('remittances', 4, async () => {
    for (const ch of ctx.churches) {
      const recons = (await q(
        `SELECT id, amount, department_id FROM mpesa_reconciliations WHERE church_id = $1 AND status = 'remitted' LIMIT 10`, [ch.id])).rows;
      const pending = (await q(
        `SELECT id, amount, department_id FROM mpesa_reconciliations WHERE church_id = $1 AND status = 'reconciled' LIMIT 8`, [ch.id])).rows;
      const collector = pick(ch.leaders.length ? ch.leaders : ch.users.map(u => u.id));
      const treasurer = (await q(`SELECT user_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='Treasurer' AND u.church_id=$1 LIMIT 1`, [ch.id])).rows[0]?.user_id || ch.admins[0];
      // One confirmed remittance
      if (recons.length) {
        const total = recons.reduce((s, r) => s + Number(r.amount), 0);
        const rem = await q(
          `INSERT INTO remittances (church_id, department_id, collector_id, treasurer_id, amount, item_count, method, reference, status, notes, confirmed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirmed',$9,$10) RETURNING id`,
          [ch.id, recons[0].department_id, collector, treasurer, total, recons.length, 'mpesa', `MPESA-CONF-${ri(10000, 99999)}`,
           'Handover of departmental collections for the week', daysAgo(ri(1, 7))]);
        for (const r of recons) {
          await q(`INSERT INTO remittance_items (remittance_id, reconciliation_id) VALUES ($1,$2)`, [rem.rows[0].id, r.id]);
          await q(`UPDATE mpesa_reconciliations SET remittance_id = $1 WHERE id = $2`, [rem.rows[0].id, r.id]);
        }
      }
      // One pending remittance
      if (pending.length) {
        const total = pending.reduce((s, r) => s + Number(r.amount), 0);
        const rem = await q(
          `INSERT INTO remittances (church_id, department_id, collector_id, treasurer_id, amount, item_count, method, reference, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9) RETURNING id`,
          [ch.id, pending[0].department_id, collector, treasurer, total, pending.length, 'bank_deposit', `DEP-${ri(10000, 99999)}`,
           'Awaiting treasurer confirmation']);
        for (const r of pending) {
          await q(`INSERT INTO remittance_items (remittance_id, reconciliation_id) VALUES ($1,$2)`, [rem.rows[0].id, r.id]);
          await q(`UPDATE mpesa_reconciliations SET remittance_id = $1 WHERE id = $2`, [rem.rows[0].id, r.id]);
        }
      }
    }
  });

  // ---- Documents + versions
  await seed('documents', 10, async () => {
    const docs = [
      ['Church Constitution 2026', 'constitution-2026.pdf', 'governance', 'Constitution and bylaws'],
      ['Budget Summary Q1 2026', 'budget-q1-2026.pdf', 'finance', 'Approved first-quarter budget'],
      ['Board Meeting Minutes — January', 'minutes-jan-2026.pdf', 'minutes', 'Church board meeting minutes'],
      ['Membership Handbook', 'membership-handbook.pdf', 'membership', 'Guide for new members'],
      ['Department Handbook', 'department-handbook.pdf', 'departments', 'Roles and responsibilities'],
      ['Camp Meeting Guidelines', 'camp-guidelines.pdf', 'events', 'Rules and packing list'],
      ['Safeguarding Policy', 'safeguarding-policy.pdf', 'policy', 'Child protection policy'],
      ['Financial Procedures Manual', 'finance-manual.pdf', 'finance', 'Cash handling procedures'],
    ];
    for (const ch of ctx.churches) {
      const by = pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id));
      for (const [name, file, cat, desc] of docs) {
        await q(
          `INSERT INTO documents (name, file_name, file_path, file_url, file_size, category, description, uploaded_by, storage_provider, church_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'local',$9)`,
          [`${name}`, file, `/uploads/documents/${file}`, `/api/documents/file/${file}`, ri(50000, 3000000), cat, desc, by, ch.id]);
      }
    }
  });
  await seed('document_versions', 10, async () => {
    const docs = (await q(`SELECT id, file_path, file_size, uploaded_by FROM documents LIMIT 40`)).rows;
    for (const d of docs) {
      await q(
        `INSERT INTO document_versions (document_id, file_path, file_size, version_number, change_summary, uploaded_by)
         VALUES ($1,$2,$3,1,'Initial version',$4)`,
        [d.id, d.file_path, d.file_size || 1024, d.uploaded_by]);
    }
  });

  // ---- Settings (per church)
  await seed('settings', 15, async () => {
    const defs = [
      ['church.service_times', 'Sabbath School 9:00 AM, Divine Service 11:00 AM', 'services'],
      ['church.address', 'Kiserian Town, off Ngong Road', 'general'],
      ['mpesa.paybill', '522533', 'payments'],
      ['mpesa.till', '5480912', 'payments'],
      ['announcements.max_per_day', '5', 'communications'],
      ['events.rsvp_enabled', 'true', 'events'],
      ['finance.default_currency', 'KES', 'finance'],
      ['notifications.email_enabled', 'true', 'notifications'],
      ['notifications.sms_enabled', 'true', 'notifications'],
      ['gallery.max_upload_mb', '10', 'media'],
      ['departments.max_heads', '2', 'departments'],
      ['membership.auto_number', 'true', 'members'],
      ['security.session_timeout_min', '60', 'security'],
      ['reports.fiscal_year_start', '1', 'finance'],
      ['mobile.app_min_version', '1.7.0', 'mobile'],
    ];
    for (const ch of ctx.churches) {
      for (const [key, value, cat] of defs) {
        const exists = await q(`SELECT 1 FROM settings WHERE key=$1 AND church_id=$2`, [key, ch.id]);
        if (!exists.rows.length) {
          await q(`INSERT INTO settings (key, value, category, label, description, is_public, church_id)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [key, value, cat, key, `${cat} setting: ${key}`, cat === 'general' || cat === 'services', ch.id]);
        }
      }
    }
  });

  // ---- Notification preferences for leadership + a slice of members
  await seed('notification_preferences', 60, async () => {
    for (const ch of ctx.churches) {
      const targets = [...new Set([...ch.leaders, ...ch.users.slice(0, 60).map(u => u.id)])];
      for (const uid of targets) {
        await q(
          `INSERT INTO notification_preferences (user_id, church_id, email_enabled, sms_enabled, push_enabled, in_app_enabled)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [uid, ch.id, true, Math.random() > 0.3, true, true]);
      }
    }
  });

  // ---- SMS: groups, contacts, templates, message templates
  await seed('sms_groups', 5, async () => {
    const groups = ['All Members', 'Department Heads', 'Youth', 'Elders Council', 'Choir'];
    for (const ch of ctx.churches) {
      for (const g of groups) {
        await q(`INSERT INTO sms_groups (church_id, name, description, contact_count) VALUES ($1,$2,$3,0) ON CONFLICT DO NOTHING`,
          [ch.id, g, `${g} broadcast group`]);
      }
    }
  });
  await seed('sms_contacts', 20, async () => {
    const groups = (await q(`SELECT id, church_id, name FROM sms_groups`)).rows;
    for (const g of groups) {
      const ch = ctx.churches.find(c => c.id === g.church_id);
      if (!ch) continue;
      for (let i = 0; i < ri(8, 20); i++) {
        const u = pick(ch.users);
        await q(
          `INSERT INTO sms_contacts (church_id, name, phone, group_id, status)
           VALUES ($1,$2,$3,$4,'active')`,
          [ch.id, `${u.first_name} ${u.last_name}`, phone(), g.id]);
      }
      await q(`UPDATE sms_groups SET contact_count = (SELECT count(*) FROM sms_contacts WHERE group_id = $1) WHERE id = $1`, [g.id]);
    }
  });
  await seed('sms_templates', 6, async () => {
    const tpl = [
      ['Sabbath Reminder', 'reminder', 'Dear {name}, reminder: Sabbath services tomorrow 9AM. Blessed Sabbath!'],
      ['Event Invitation', 'event', 'You are invited to {event} on {date}. Venue: {venue}. See you there!'],
      ['Payment Receipt', 'receipt', 'Thank you {name}. We received KES {amount} for {purpose}. Ref: {ref}.'],
      ['Announcement Blast', 'announcement', 'Church announcement: {message}'],
      ['Birthday Wishes', 'greeting', 'Happy birthday {name}! May God bless your new year.'],
      ['Prayer Request Reply', 'pastoral', 'Dear {name}, your prayer request has been received. Be blessed.'],
    ];
    for (const [name, type, content] of tpl) {
      await q(`INSERT INTO sms_templates (name, content, template_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [name, content, type]);
    }
  });
  await seed('message_templates', 6, async () => {
    const tpl = [
      ['Department Meeting Notice', 'Reminder: {dept} meeting this {day} at {time}. Agenda: {agenda}.', 'Department'],
      ['Collection Update', '{dept} has collected KES {amount} of KES {target}. Thank you for your faithfulness.', 'Finance'],
      ['New Member Welcome', 'Welcome {name} to {dept}! Please reach out to {head} for orientation.', 'Membership'],
      ['Handover Notice', '{name} has handed over {dept} duties effective {date}. All documents transferred.', 'Governance'],
      ['Budget Approved', 'The {dept} budget of KES {amount} for {purpose} is now active.', 'Finance'],
      ['General Notice', '{message}', 'General'],
    ];
    for (const ch of ctx.churches) {
      for (const [name, content, cat] of tpl) {
        await q(
          `INSERT INTO message_templates (church_id, name, content, category, created_by)
           VALUES ($1,$2,$3,$4,$5)`,
          [ch.id, name, content, cat, ch.admins[0] || null]);
      }
    }
  });

  // ---- Department communications + tasks
  await seed('department_communications', 20, async () => {
    const msgs = [
      ['Meeting this Sabbath', 'Reminder that our department meets after divine service in the main hall.', 'announcement'],
      ['Collection Progress', 'We are at 60% of our quarterly target. Keep pushing!', 'update'],
      ['New Member Orientation', 'Welcome session for new members next Sunday 2PM.', 'announcement'],
      ['Budget Approved', 'Our departmental budget has been approved by the board.', 'update'],
      ['Outreach Planning', 'Planning session for the community outreach scheduled for next month.', 'meeting'],
    ];
    for (const ch of ctx.churches) {
      for (const d of ch.depts.slice(0, 15)) {
        const [title, body, type] = pick(msgs);
        await q(
          `INSERT INTO department_communications (department_id, church_id, title, body, type, created_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [d.id, ch.id, `${title} — ${d.name}`, body, type, pick(ch.leaders.length ? ch.leaders : ch.users.map(u => u.id))]);
      }
    }
  });
  await seed('tasks', 20, async () => {
    const items = [
      ['Prepare Sabbath program', 'Draft order of service and assign speakers', 'high'],
      ['Update member register', 'Verify contact details for new members', 'normal'],
      ['Order supplies', 'Purchase materials for next quarter', 'normal'],
      ['Plan outreach day', 'Confirm venue and volunteers', 'high'],
      ['Submit monthly report', 'Compile attendance and finance report', 'high'],
      ['Clean church premises', 'Roster for cleaning duty', 'low'],
      ['Follow up pledges', 'Call members with outstanding pledges', 'normal'],
    ];
    for (const ch of ctx.churches) {
      for (const d of ch.depts.slice(0, 12)) {
        const [title, desc, pri] = pick(items);
        await q(
          `INSERT INTO tasks (department_id, church_id, title, description, status, priority, assigned_to, due_date, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [d.id, ch.id, `${title} — ${d.name}`, desc, pick(['pending', 'in_progress', 'pending', 'completed']),
           pri, pick(ch.users).id, daysAhead(ri(3, 30)), pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id))]);
      }
    }
  });

  // ---- Fixed assets + maintenance
  await seed('fixed_assets', 8, async () => {
    const assets = [
      ['FA-PA-001', 'PA System (Yamaha)', 'Equipment', 85000],
      ['FA-PJ-002', 'Projector Epson EB-X51', 'Equipment', 62000],
      ['FA-CH-003', 'Church Benches (40)', 'Furniture', 240000],
      ['FA-TN-004', 'Tent Canopy 100-seater', 'Equipment', 95000],
      ['FA-KT-005', 'Kitchen Equipment', 'Equipment', 78000],
      ['FA-CM-006', 'Desktop Computer (Office)', 'Electronics', 55000],
      ['FA-SF-007', 'Safe — Treasurer Office', 'Furniture', 42000],
      ['FA-IN-008', 'Keyboard & Amplifier', 'Equipment', 68000],
    ];
    for (const ch of ctx.churches) {
      for (const [code, name, type, price] of assets) {
        await q(
          `INSERT INTO fixed_assets (asset_code, asset_name, asset_type, purchase_date, purchase_price, current_value, depreciation_method, useful_life, accumulated_depreciation, location, status)
           VALUES ($1,$2,$3,$4,$5,$6,'straight_line',$7,$8,$9,'active')`,
          [`${code}-${ch.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`, name, type, daysAgo(ri(180, 900)),
           price, Math.round(price * (0.7 + Math.random() * 0.25)), ri(5, 10),
           Math.round(price * Math.random() * 0.3), pick(['Main Hall', 'Office', 'Storage', 'Sanctuary'])]);
      }
    }
  });
  await seed('maintenance_schedules', 1, async () => {
    for (let i = 0; i < 3; i++) {
      await q(
        `INSERT INTO maintenance_schedules (scheduled_at, duration, message, status, created_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [daysAhead(ri(7, 45)), pick(['30 minutes', '1 hour', '2 hours']),
         pick(['Database maintenance and backup verification', 'SSL certificate renewal window', 'Scheduled platform update']),
         'scheduled', ctx.churches[0]?.admins[0] || null]);
    }
  });

  // ---- Payment items + disputes
  await seed('payment_items', 30, async () => {
    for (const ch of ctx.churches) {
      if (!ch.payments.length || !ctx.payCats.length) continue;
      for (const p of ch.payments.slice(0, 40)) {
        await q(`INSERT INTO payment_items (payment_id, category_id, amount) VALUES ($1,$2,$3)`,
          [p.id, pick(ctx.payCats).id, Math.abs(Number(p.amount)) || rAmt(100, 5000)]);
      }
    }
  });
  await seed('payment_disputes', 2, async () => {
    for (const ch of ctx.churches) {
      if (!ch.payments.length) continue;
      for (const p of ch.payments.slice(0, 2)) {
        await q(
          `INSERT INTO payment_disputes (payment_id, dispute_reason, status)
           VALUES ($1,$2,'open')`,
          [p.id, pick(['Amount recorded does not match M-Pesa message', 'Payment allocated to wrong member', 'Duplicate transaction suspected'])]);
      }
    }
  });

  // ---- Event collections
  await seed('event_collections', 5, async () => {
    for (const ch of ctx.churches) {
      for (const ev of ch.events.slice(0, 4)) {
        const target = rAmt(20000, 150000);
        await q(
          `INSERT INTO event_collections (title, description, target_amount, current_amount, church_id, event_id, department_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [`Collection — ${ev.title}`, `Fundraising for ${ev.title}`, target, rAmt(0, target), ch.id, ev.id,
           ch.depts.length ? pick(ch.depts).id : null]);
      }
    }
  });

  // ---- Gallery: albums, tags, comments, photo tags
  await seed('gallery_albums', 4, async () => {
    const albums = ['Sabbath Services', 'Camp Meeting 2025', 'Baptism Ceremony', 'Community Outreach', 'Church Anniversary'];
    for (const ch of ctx.churches) {
      for (const a of albums) {
        await q(
          `INSERT INTO gallery_albums (title, description, created_by, church_id, is_private, order_index)
           VALUES ($1,$2,$3,$4,false,$5)`,
          [a, `${a} photo collection`, pick(ch.admins.length ? ch.admins : ch.users.map(u => u.id)), ch.id, ri(0, 5)]);
      }
    }
  });
  await seed('gallery_tags', 5, async () => {
    const tags = ['sabbath', 'worship', 'youth', 'outreach', 'baptism', 'fellowship'];
    for (const ch of ctx.churches) {
      for (const t of tags) {
        await q(`INSERT INTO gallery_tags (name, slug, church_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [t, `${t}-${ch.slug.slice(0, 6)}`, ch.id]);
      }
    }
  });
  await seed('gallery_comments', 15, async () => {
    const comments = ['Beautiful service!', 'Blessed Sabbath everyone', 'Great moment captured', 'Amen!', 'Wonderful fellowship', 'Praise God for this day'];
    for (const ch of ctx.churches) {
      for (const ph of ch.photos.slice(0, 10)) {
        for (let i = 0; i < ri(1, 3); i++) {
          await q(`INSERT INTO gallery_comments (photo_id, user_id, church_id, comment) VALUES ($1,$2,$3,$4)`,
            [ph.id, pick(ch.users).id, ch.id, pick(comments)]);
        }
      }
    }
  });
  await seed('gallery_photo_tags', 10, async () => {
    const tags = (await q(`SELECT id, church_id FROM gallery_tags`)).rows;
    for (const ch of ctx.churches) {
      for (const ph of ch.photos.slice(0, 15)) {
        const t = pick(tags.filter(t => t.church_id === ch.id));
        if (t) await q(`INSERT INTO gallery_photo_tags (photo_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [ph.id, t.id]);
      }
    }
  });

  // ---- Telegram posts on existing channel
  await seed('telegram_posts', 5, async () => {
    for (const tc of ctx.telegramChannels) {
      const msgs = [
        'Sabbath blessings to all! Service starts 9AM tomorrow.',
        'Photo highlights from last week\'s outreach program',
        'Reminder: departmental reports due this Friday',
        'Prayer requests can be sent to this channel anytime',
        'Camp meeting registration closes next Sunday',
        'Choir practice moved to Thursday 6PM',
        'Thanksgiving service this Sabbath — bring a friend!',
      ];
      for (let i = 0; i < msgs.length; i++) {
        await q(
          `INSERT INTO telegram_posts (channel_id, message_id, message_text, media_type, posted_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [tc.id, 1000 + i, msgs[i], pick(['text', 'text', 'photo']), daysAgo(ri(0, 30))]);
      }
    }
  });

  // ---- Approval requests (pending inbox items)
  await seed('approval_requests', 150, async () => {
    const reqs = [
      ['Budget approval — Choir uniforms', 'budget', 'department_budget', 45000, 'high'],
      ['Event approval — Youth rally', 'event', 'event', 30000, 'normal'],
      ['Leave request — Dept head', 'leave', 'department_leadership', 0, 'low'],
      ['Purchase — PA cables', 'purchase', 'expense', 8500, 'normal'],
      ['New member registration batch', 'member', 'members', 0, 'normal'],
      ['Department handover — Treasury', 'handover', 'department_handovers', 0, 'high'],
    ];
    for (const ch of ctx.churches) {
      for (const [title, type, entity, amount, pri] of reqs) {
        const exists = await q(`SELECT 1 FROM approval_requests WHERE title=$1 AND church_id=$2`, [`${title} (${ch.slug})`, ch.id]);
        if (exists.rows.length) continue;
        await q(
          `INSERT INTO approval_requests (church_id, title, description, request_type, entity_type, status, priority, amount, requested_by, requester_id, requested_at)
           VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$8,$9)`,
          [ch.id, `${title} (${ch.slug})`, `${title} — requires review by church leadership`, type, entity, pri,
           amount || null, pick(ch.users).id, daysAgo(ri(0, 14))]);
      }
    }
  });

  // ---- Audit + system logs
  await seed('audit_log', 30, async () => {
    const actions = ['user.login', 'user.create', 'payment.create', 'department.update', 'announcement.publish', 'role.assign', 'settings.update'];
    for (const ch of ctx.churches) {
      for (let i = 0; i < 15; i++) {
        const u = pick(ch.users);
        await q(
          `INSERT INTO audit_log (user_id, action, table_name, new_values, ip_address, user_agent, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [u.id, pick(actions), pick(['users', 'payments', 'departments', 'announcements', 'settings']),
           JSON.stringify({ changed: true }), `41.90.${ri(1, 254)}.${ri(1, 254)}`,
           'Mozilla/5.0 (Linux; Android 13; SM-S911B)', daysAgo(ri(0, 30))]);
      }
    }
  });
  await seed('system_logs', 30, async () => {
    const logs = [
      ['info', 'scheduler', 'Daily backup completed successfully'],
      ['info', 'mpesa', 'Processed 12 pending callbacks'],
      ['warn', 'auth', 'Elevated failed-login rate from 41.90.120.x'],
      ['info', 'notifications', 'SMS batch dispatched: 45 recipients'],
      ['error', 'storage', 'Retrying failed file upload — timeout'],
      ['info', 'telegram', 'Channel sync completed: 7 new posts'],
      ['warn', 'rate_limiter', 'Rate limit hit on /api/auth/login'],
      ['info', 'migrations', 'Migration 040 applied'],
    ];
    for (const [lvl, mod, msg] of logs) {
      for (let i = 0; i < ri(3, 8); i++) {
        await q(`INSERT INTO system_logs (log_level, module, message, metadata, created_at) VALUES ($1,$2,$3,$4,$5)`,
          [lvl, mod, msg, JSON.stringify({ seed: true }), daysAgo(ri(0, 30))]);
      }
    }
  });

  // ---- Platform tables (platform admin dashboards)
  await seed('platform_stats', 30, async () => {
    for (let i = 30; i >= 0; i--) {
      const d = daysAgo(i).toISOString().slice(0, 10);
      const exists = await q(`SELECT 1 FROM platform_stats WHERE stat_date=$1`, [d]);
      if (exists.rows.length) continue;
      await q(
        `INSERT INTO platform_stats (stat_date, total_churches, active_churches, total_mrr, new_churches, churned_churches, arpc, platform_health_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [d, 4 + ri(0, 3), 4, 180000 + ri(-8000, 8000), i % 9 === 0 ? 1 : 0, 0, 45000 + ri(-2000, 2000), ri(88, 99)]);
    }
  });
  await seed('platform_alerts', 3, async () => {
    const alerts = [
      ['capacity', 'medium', 'sms gateway balance below KES 5,000', 'sms-gateway'],
      ['uptime', 'low', 'Scheduled maintenance completed on cms_db', 'database'],
      ['security', 'critical', 'Unusual login pattern detected on admin account', 'auth'],
      ['billing', 'medium', 'Church subscription renewals due in 7 days', 'billing'],
    ];
    for (const [type, sev, msg, svc] of alerts) {
      await q(
        `INSERT INTO platform_alerts (alert_type, severity, message, service_affected, status)
         VALUES ($1,$2,$3,$4,$5)`,
        [type, sev, msg, svc, pick(['active', 'resolved'])]);
    }
  });

  console.log('\n=== Deep seed results ===');
  results.forEach(r => console.log(' ', r));
  await pool.end();
}

main().catch(e => { console.error('SEED FAILED:', e.message, e.detail || ''); pool.end(); process.exit(1); });
