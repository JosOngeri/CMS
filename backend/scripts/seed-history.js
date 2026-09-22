/**
 * Seed ~3 years of operational history for the seeded churches.
 * Covers: events, event_attendance, announcements, transactions,
 * payments, notifications, approval_requests.
 *
 * Idempotent-ish: skips a church if it already has seeded history
 * (checks for existing events for that church).
 *
 * Usage: node scripts/seed-history.js
 */
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CHURCHES = ['newlife', 'mount-horeb', 'kiserian-dam'];

const THREE_YEARS_AGO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d;
})();
const NOW = new Date();

const EVENT_TEMPLATES = [
  { title: 'Sabbath Service', dayOfWeek: 6, recurring: 'weekly' },
  { title: 'Sabbath School', dayOfWeek: 6, recurring: 'weekly' },
  { title: 'Midweek Prayer Meeting', dayOfWeek: 3, recurring: 'weekly' },
];
const SPECIAL_EVENTS = [
  'Communion Service', 'Youth Rally', 'Evangelistic Campaign', 'Church Business Meeting',
  'Women Ministry Day', 'Men Ministry Breakfast', 'Health Expo', 'Children Sabbath',
  'Choir Concert', 'Pathfinder Day', 'Harvest Thanksgiving', 'Leadership Training'
];
const ANNOUNCEMENT_TOPICS = [
  'Sabbath service starts at 9:00 AM. Please arrive early.',
  'Choir practice this Friday at 5:00 PM in the main hall.',
  'Tithes and offerings can be sent via M-Pesa Paybill.',
  'Prayer meeting on Wednesday evening — all are welcome.',
  'Registration open for the upcoming youth rally.',
  'Community health screening next Sabbath after service.',
  'Department leaders meeting this Sunday at 2:00 PM.',
  'Thanksgiving service for exam candidates this month.',
  'Please update your contact details with the church clerk.',
  'Baptismal class starts this week — see the pastor for details.',
  'Church workday this Sunday — bring tools and a friend.',
  'Quarterly business meeting next week; reports due Friday.',
];
const EXPENSE_ITEMS = [
  'Electricity bill', 'Water bill', 'Sanctuary maintenance', 'Instrument repair',
  'Communion supplies', 'Sabbath School materials', 'Evangelism outreach transport',
  'Guest speaker appreciation', 'Children department supplies', 'Office stationery',
  'Sound system maintenance', 'Flowers and decoration', 'Security services',
];
const PAYMENT_TYPES = ['Tithe', 'Offering', 'Thanksgiving', 'Camp meeting', 'Building fund', 'Welfare'];
const APPROVAL_TYPES = [
  { type: 'budget', title: 'Department budget request' },
  { type: 'event', title: 'Event approval' },
  { type: 'expense', title: 'Expense reimbursement' },
  { type: 'member', title: 'Member transfer request' },
  { type: 'equipment', title: 'Equipment purchase' },
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function addDays(date, days) { return new Date(date.getTime() + days * 86400000); }
function iso(d) { return d.toISOString(); }
function money(min, max) { return (Math.random() * (max - min) + min).toFixed(2); }
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function bulkInsert(client, sql, columns, rows, chunkSize = 2000) {
  let total = 0;
  for (const part of chunk(rows, chunkSize)) {
    // build VALUES lists
    const values = [];
    const params = [];
    part.forEach((row, ri) => {
      const ph = columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(',');
      values.push(`(${ph})`);
      params.push(...row);
    });
    await client.query(`${sql} VALUES ${values.join(',')}`, params);
    total += part.length;
  }
  return total;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'cms_db',
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  // Ensure columns that differ between local and production schemas
  await client.query(`
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by UUID;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(50);
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS request_data JSONB;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS title VARCHAR(200);
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_id UUID;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approver_id UUID;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS department_id UUID;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS module VARCHAR(50);
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2);
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS comments TEXT;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
    ALTER TABLE approval_requests ALTER COLUMN entity_id DROP NOT NULL;
    ALTER TABLE approval_requests ALTER COLUMN requested_by DROP NOT NULL;
  `);

  for (const slug of CHURCHES) {
    const churchRes = await client.query('SELECT id, name FROM churches WHERE slug = $1', [slug]);
    if (!churchRes.rows.length) { console.log(`skip ${slug}: church not found`); continue; }
    const church = churchRes.rows[0];
    const churchId = church.id;

    const existing = await client.query('SELECT COUNT(*)::int AS c FROM notifications WHERE church_id = $1', [churchId]);
    if (existing.rows[0].c > 100) { console.log(`skip ${slug}: already seeded (${existing.rows[0].c} notifications)`); continue; }

    const membersRes = await client.query(
      'SELECT m.id AS member_id, m.user_id, m.phone FROM members m WHERE m.church_id = $1 ORDER BY m.id',
      [churchId]
    );
    const members = membersRes.rows;
    if (!members.length) { console.log(`skip ${slug}: no members`); continue; }
    const deptsRes = await client.query('SELECT id, slug FROM departments WHERE church_id = $1', [churchId]);
    const depts = deptsRes.rows;
    const organizer = members[0].user_id;

    console.log(`\n=== ${church.name} (${slug}) — ${members.length} members ===`);

    const has = async (sql) =>
      (await client.query(sql, [churchId])).rows[0].c > 0;

    // Spread member joined_date across the last 3 years
    await client.query(
      `UPDATE members SET joined_date = to_timestamp($1 + floor(random() * $2)::bigint)
       WHERE church_id = $3`,
      [Math.floor(THREE_YEARS_AGO.getTime() / 1000), Math.floor((NOW - THREE_YEARS_AGO) / 1000), churchId]
    );

    // ---- Events: 3x weekly + 1 special/month for 3 years ----
    let evCount = 0;
    if (!(await has('SELECT COUNT(*)::int AS c FROM events WHERE church_id = $1'))) {
      const events = [];
      let d = new Date(THREE_YEARS_AGO);
      while (d <= NOW) {
        for (const tpl of EVENT_TEMPLATES) {
          if (d.getDay() === tpl.dayOfWeek) {
            events.push([
              tpl.title, `${tpl.title} at ${church.name}`, iso(d), 'Main Sanctuary',
              null, organizer, true, null, churchId
            ]);
          }
        }
        if (d.getDate() === 15) {
          const title = randomItem(SPECIAL_EVENTS);
          events.push([title, `${title} at ${church.name}`, iso(d), 'Main Sanctuary', null, organizer, true, 200, churchId]);
        }
        d = addDays(d, 1);
      }
      evCount = await bulkInsert(client,
        `INSERT INTO events (title, description, event_date, location, department_id, organizer_id, is_public, max_attendees, church_id)`,
        ['title','description','event_date','location','department_id','organizer_id','is_public','max_attendees','church_id'],
        events);
    }
    console.log(`  events: ${evCount || 'existing'}`);

    // ---- Attendance: sample members per event ----
    let attCount = 0;
    const eventIds = (await client.query('SELECT id, event_date FROM events WHERE church_id = $1 ORDER BY event_date', [churchId])).rows;
    if (!(await has('SELECT COUNT(*)::int AS c FROM event_attendance ea JOIN events e ON e.id = ea.event_id WHERE e.church_id = $1'))) {
      const attRows = [];
      for (const ev of eventIds) {
        const rate = 0.55 + Math.random() * 0.25; // 55-80% attendance
        const attendees = Math.min(members.length, Math.max(20, Math.floor(members.length * rate)));
        const cap = Math.min(attendees, 180); // cap rows per event
        const sample = members.slice().sort(() => Math.random() - 0.5).slice(0, cap);
        for (const m of sample) {
          // event_attendance.member_id references users.id
          attRows.push([ev.id, m.user_id, ev.event_date, Math.random() < 0.92]);
        }
      }
      attCount = await bulkInsert(client,
        `INSERT INTO event_attendance (event_id, member_id, registered_at, attended)`,
        ['event_id','member_id','registered_at','attended'],
        attRows, 3000);
    }
    console.log(`  event_attendance: ${attCount || 'existing'}`);

    // ---- Announcements: ~2-3 per month ----
    let annCount = 0;
    if (!(await has('SELECT COUNT(*)::int AS c FROM announcements WHERE church_id = $1'))) {
      const ann = [];
      let am = new Date(THREE_YEARS_AGO);
      while (am <= NOW) {
        for (let k = 0; k < randomInt(2, 3); k++) {
          const day = randomInt(1, 27);
          const dt = new Date(am.getFullYear(), am.getMonth(), day, randomInt(8, 18), 0);
          const dept = Math.random() < 0.3 && depts.length ? randomItem(depts).id : null;
          ann.push([
            randomItem(['Weekly Notice', 'Announcement', 'Reminder', 'Update']),
            randomItem(ANNOUNCEMENT_TOPICS),
            'general', dept, organizer, true,
            randomItem(['low', 'normal', 'high']),
            iso(addDays(dt, 7)), iso(dt), churchId, true
          ]);
        }
        am = new Date(am.getFullYear(), am.getMonth() + 1, 1);
      }
      annCount = await bulkInsert(client,
        `INSERT INTO announcements (title, content, announcement_type, department_id, author_id, is_public, priority, expires_at, created_at, church_id, is_published)`,
        ['title','content','announcement_type','department_id','author_id','is_public','priority','expires_at','created_at','church_id','is_published'],
        ann);
    }
    console.log(`  announcements: ${annCount || 'existing'}`);

    // ---- Transactions: weekly offering + monthly expenses ----
    let txCount = 0;
    if (!(await has('SELECT COUNT(*)::int AS c FROM transactions WHERE church_id = $1'))) {
      const tx = [];
      let tm = new Date(THREE_YEARS_AGO);
      while (tm <= NOW) {
        if (tm.getDay() === 6) {
          tx.push(['income', null, money(5000, 40000), 'Sabbath offering', iso(tm).slice(0, 10), 'approved', churchId, organizer]);
          if (Math.random() < 0.8) {
            tx.push(['income', null, money(20000, 200000), 'Tithe receipts', iso(tm).slice(0, 10), 'approved', churchId, organizer]);
          }
        }
        if (tm.getDate() === 5) {
          const nExp = randomInt(2, 4);
          for (let k = 0; k < nExp; k++) {
            tx.push(['expense', null, money(1000, 25000), randomItem(EXPENSE_ITEMS), iso(tm).slice(0, 10), 'approved', churchId, organizer]);
          }
        }
        tm = addDays(tm, 1);
      }
      txCount = await bulkInsert(client,
        `INSERT INTO transactions (transaction_type, category_id, amount, description, transaction_date, status, church_id, created_by)`,
        ['transaction_type','category_id','amount','description','transaction_date','status','church_id','created_by'],
        tx);
    }
    console.log(`  transactions: ${txCount || 'existing'}`);

    // ---- Payments: ~6-14 payments per member over 3 years ----
    let payCount = 0;
    if (!(await has('SELECT COUNT(*)::int AS c FROM payments WHERE church_id = $1'))) {
      const pay = [];
      for (const m of members) {
        const n = randomInt(6, 14);
        for (let k = 0; k < n; k++) {
          const dt = new Date(THREE_YEARS_AGO.getTime() + Math.random() * (NOW - THREE_YEARS_AGO));
          pay.push([
            m.user_id, // payments.member_id references users.id
            `TXN${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            `MP${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            m.phone || `+2547${randomInt(10000000, 99999999)}`,
            money(100, 8000), iso(dt), randomItem(['completed', 'completed', 'completed', 'pending']),
            'mpesa', randomItem(PAYMENT_TYPES), churchId
          ]);
        }
      }
      payCount = await bulkInsert(client,
        `INSERT INTO payments (member_id, transaction_id, mpesa_receipt_number, phone_number, amount, payment_date, status, payment_method, notes, church_id)`,
        ['member_id','transaction_id','mpesa_receipt_number','phone_number','amount','payment_date','status','payment_method','notes','church_id'],
        pay, 3000);
    }
    console.log(`  payments: ${payCount || 'existing'}`);

    // ---- Notifications: a few per member ----
    let notifCount = 0;
    {
      const notifs = [];
      const notifTypes = [
        ['event_reminder', 'Event Reminder', 'Reminder: upcoming church event this week.'],
        ['announcement', 'New Announcement', 'A new announcement has been posted for your church.'],
        ['payment', 'Payment Received', 'Your payment has been received and recorded.'],
        ['membership', 'Membership Update', 'Your membership record has been updated.'],
      ];
      for (const m of members) {
        const n = randomInt(3, 7);
        for (let k = 0; k < n; k++) {
          const [type, title, body] = randomItem(notifTypes);
          const dt = new Date(THREE_YEARS_AGO.getTime() + Math.random() * (NOW - THREE_YEARS_AGO));
          const read = Math.random() < 0.7;
          notifs.push([m.user_id, m.user_id, type, title, body, null, read, read ? iso(dt) : null, churchId, null, null, iso(dt)]);
        }
      }
      notifCount = await bulkInsert(client,
        `INSERT INTO notifications (user_id, recipient_id, type, title, body, link, is_read, read_at, church_id, related_entity_type, related_entity_id, created_at)`,
        ['user_id','recipient_id','type','title','body','link','is_read','read_at','church_id','related_entity_type','related_entity_id','created_at'],
        notifs, 3000);
    }
    console.log(`  notifications: ${notifCount}`);

    // ---- Approval requests: ~30-60 per church ----
    let apprCount = 0;
    if (!(await has('SELECT COUNT(*)::int AS c FROM approval_requests WHERE church_id = $1'))) {
      const appr = [];
      const nAppr = randomInt(30, 60);
      for (let k = 0; k < nAppr; k++) {
        const tpl = randomItem(APPROVAL_TYPES);
        const requester = randomItem(members).user_id;
        const approver = randomItem(members).user_id;
        const dt = new Date(THREE_YEARS_AGO.getTime() + Math.random() * (NOW - THREE_YEARS_AGO));
        const status = Math.random() < 0.75 ? 'approved' : (Math.random() < 0.5 ? 'pending' : 'rejected');
        const dept = depts.length ? randomItem(depts).id : null;
        appr.push([
          tpl.title, `${tpl.title} for ${church.name}`, tpl.type,
          JSON.stringify({ amount: randomInt(1000, 50000) }), null, 'department',
          requester, status === 'pending' ? null : approver, dept,
          'departments', tpl.type === 'expense' || tpl.type === 'equipment' ? money(1000, 50000) : null,
          randomItem(['low', 'normal', 'high']), status, null, churchId,
          iso(dt), status === 'approved' ? iso(addDays(dt, randomInt(1, 7))) : null,
          status === 'rejected' ? iso(addDays(dt, randomInt(1, 7))) : null
        ]);
      }
      apprCount = await bulkInsert(client,
        `INSERT INTO approval_requests (title, description, request_type, request_data, metadata, entity_type, requester_id, approver_id, department_id, module, amount, priority, status, comments, church_id, requested_at, approved_at, rejected_at)`,
        ['title','description','request_type','request_data','metadata','entity_type','requester_id','approver_id','department_id','module','amount','priority','status','comments','church_id','requested_at','approved_at','rejected_at'],
        appr);
    }
    console.log(`  approval_requests: ${apprCount || 'existing'}`);
  }

  // Summary
  const summary = await client.query(`
    SELECT c.slug,
      (SELECT COUNT(*) FROM events e WHERE e.church_id = c.id) AS events,
      (SELECT COUNT(*) FROM event_attendance ea JOIN events e2 ON e2.id = ea.event_id WHERE e2.church_id = c.id) AS attendance,
      (SELECT COUNT(*) FROM announcements a WHERE a.church_id = c.id) AS announcements,
      (SELECT COUNT(*) FROM transactions t WHERE t.church_id = c.id) AS transactions,
      (SELECT COUNT(*) FROM payments p WHERE p.church_id = c.id) AS payments,
      (SELECT COUNT(*) FROM notifications n WHERE n.church_id = c.id) AS notifications,
      (SELECT COUNT(*) FROM approval_requests ar WHERE ar.church_id = c.id) AS approvals
    FROM churches c WHERE c.slug = ANY($1) ORDER BY c.slug`, [CHURCHES]);
  console.log('\n=== Final counts ===');
  summary.rows.forEach(r => console.log(`  ${r.slug}: ${r.events} events, ${r.attendance} attendance, ${r.announcements} announcements, ${r.transactions} transactions, ${r.payments} payments, ${r.notifications} notifications, ${r.approvals} approvals`));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
