/**
 * fill-kiserian-main.js
 *
 * kiserian-main-sda is the flagship tenant but was skipped by the bulk
 * historical seeders — it had 0 events, 0 announcements and 6 payments while
 * sibling churches have 500+/90+/2000+. This fills just that church:
 *
 *   - ~1 year of events (weekly Sabbath School + Sabbath Service + specials)
 *   - ~25 announcements covering type/priority/published/public permutations
 *   - ~80 payments across members, methods, categories and statuses
 *
 * Idempotent: events match on (church, title, DATE(event_date));
 * announcements on (church, title); payments on a stable notes marker.
 * Safe to re-run. Usage: node scripts/fill-kiserian-main.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');
const { requireDevDatabase } = require('./_scriptSafety');

requireDevDatabase('fill-kiserian-main.js');

const CHURCH_SLUG = 'kiserian-main-sda';
const daysAgo = n => new Date(Date.now() - n * 864e5);
const daysAhead = n => new Date(Date.now() + n * 864e5);

let inserted = 0, skipped = 0;

async function one(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows[0] || null;
}

/** INSERT unless a row matching `where`/`params` already exists. */
async function insertUnless(table, where, params, row) {
  const exists = await pool.query(
    `SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`, params);
  if (exists.rows.length) { skipped++; return null; }
  const cols = Object.keys(row);
  const q = await pool.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    cols.map(c => row[c]));
  inserted++;
  return q.rows[0].id;
}

// ---------------------------------------------------------------------------
// Events — a year of church calendar
// ---------------------------------------------------------------------------

async function seedEvents(churchId, ctx) {
  const events = [];

  // 52 Saturdays back + 12 ahead: Sabbath School (9am) + Sabbath Service (11am)
  const nextSaturday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return d;
  })();
  for (let w = -52; w <= 12; w++) {
    const day = new Date(nextSaturday);
    day.setDate(day.getDate() + w * 7);
    const school = new Date(day); school.setHours(9, 0, 0, 0);
    const service = new Date(day); service.setHours(11, 0, 0, 0);
    events.push({ title: 'Sabbath School', date: school, desc: 'Weekly Sabbath School classes for all ages', location: 'Church Hall', max: null, coll: false });
    events.push({ title: 'Sabbath Service', date: service, desc: 'Divine worship service', location: 'Main Sanctuary', max: 500, coll: w % 4 === 0 });
  }

  // Weekly Wednesday prayer meeting
  const nextWednesday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7));
    return d;
  })();
  for (let w = -40; w <= 8; w++) {
    const day = new Date(nextWednesday);
    day.setDate(day.getDate() + w * 7);
    day.setHours(18, 0, 0, 0);
    events.push({ title: 'Mid-Week Prayer Meeting', date: day, desc: 'Wednesday evening prayer and study', location: 'Church Hall', max: null, coll: false });
  }

  // Special events — past and future, varied RSVP/collection/department
  const dept = ctx.departmentId;
  const specials = [
    ['Camp Meeting 2026', daysAgo(60), 'Annual camp meeting — guest speaker Pr. Ochieng', 'Kiserian Grounds', true, true, 800, dept],
    ['Youth Rally', daysAgo(45), 'Regional youth rally with music and testimonies', 'Main Sanctuary', true, false, 300, dept],
    ['Communion Service', daysAgo(30), 'Quarterly communion — foot washing and emblems', 'Main Sanctuary', true, false, 500, dept],
    ['Church Board Meeting', daysAgo(21), 'Monthly board meeting — leaders only', 'Board Room', false, false, 30, dept],
    ['Harvest Thanksgiving', daysAgo(14), 'Harvest festival — bring produce for auction', 'Church Grounds', true, true, 600, dept],
    ['Baptismal Class', daysAgo(7), 'Preparation class for baptismal candidates', 'Church Hall', true, false, 40, dept],
    ['Elders Council', daysAhead(3), 'Quarterly elders council', 'Board Room', false, false, 15, dept],
    ['Music Ministry Practice', daysAhead(5), 'Choir rehearsal for upcoming service', 'Main Sanctuary', false, false, 50, dept],
    ['Community Health Expo', daysAhead(10), 'Free health screening open to the public', 'Church Grounds', true, false, 400, dept],
    ['Pathfinder Investiture', daysAhead(15), 'Annual pathfinder investiture ceremony', 'Main Sanctuary', true, false, 350, dept],
    ['Wedding: Kiprop & Wanjiru', daysAhead(20), 'Wedding ceremony — all invited', 'Main Sanctuary', true, false, 300, dept],
    ['End-Year Banquet', daysAhead(40), 'Department heads year-end celebration', 'Church Hall', false, true, 200, dept],
    ['Evangelistic Series Opening', daysAhead(25), 'Two-week evangelistic campaign kickoff', 'Main Sanctuary', true, true, 700, dept],
    ['Children Sabbath', daysAhead(30), 'Children-led Sabbath program', 'Main Sanctuary', true, false, 500, dept],
  ];
  for (const [title, date, desc, loc, pub, coll, max, d] of specials) {
    events.push({ title, date, desc, location: loc, pub, coll, max, dept: d, rsvp: date > new Date() });
  }

  for (const e of events) {
    await insertUnless('events',
      'church_id = $1 AND title = $2 AND event_date::date = $3::date',
      [churchId, e.title, e.date.toISOString().slice(0, 10)],
      {
        title: e.title,
        description: e.desc,
        event_date: e.date,
        location: e.location,
        department_id: e.dept || null,
        organizer_id: ctx.pastorId,
        is_public: e.pub !== false,
        max_attendees: e.max,
        church_id: churchId,
        rsvp_required: !!e.rsvp,
        has_collection: !!e.coll,
      });
  }
}

// ---------------------------------------------------------------------------
// Announcements — type/priority/published/public permutations
// ---------------------------------------------------------------------------

async function seedAnnouncements(churchId, ctx) {
  const dept = ctx.departmentId;
  const rows = [
    // [title, content, type, priority, published, is_public, expires_days, dept]
    ['Water Supply Interruption This Sabbath', 'County water works will cut supply Saturday 8am–2pm. Tanker water will be available at the rear entrance.', 'urgent', 'high', true, true, 7, null],
    ['Camp Meeting Registration Open', 'Registration for Camp Meeting 2026 is now open at the church office. Early-bird rate ends end of month.', 'event', 'high', true, true, 30, null],
    ['Tithe & Offering Via M-Pesa', 'Paybill 555000, account: your membership number. Send confirmation SMS to the treasurer.', 'financial', 'normal', true, true, 90, null],
    ['Choir Auditions', 'Music ministry holds auditions for new members after Sabbath service this week.', 'department', 'normal', true, true, 14, dept],
    ['Quarterly Communion This Sabbath', 'Prepare your hearts — communion service this Sabbath. Foot washing starts 10:30am.', 'general', 'high', true, true, 5, null],
    ['Board Meeting Minutes Available', 'October board meeting minutes are ready for collection at the clerk\'s desk.', 'general', 'low', true, false, 30, null],
    ['Lost and Found', 'A blue jacket and hymnbook were left in the sanctuary. Claim at the usher\'s desk.', 'general', 'low', true, true, 21, null],
    ['Building Fund Update', 'We have raised 40% of the sanctuary renovation target. Thank you for your faithfulness!', 'financial', 'normal', true, true, 60, null],
    ['Health Ministry Expo Volunteers', 'Volunteers needed for the community health expo — sign up with the health department head.', 'department', 'normal', true, true, 20, dept],
    ['Prayer Request: Sis. Muthoni', 'Please keep Sister Muthoni in prayer as she recovers from surgery.', 'general', 'high', true, false, 14, null],
    ['New Members Class', 'Inquirer\'s class for those interested in church membership starts next Sabbath, 2pm.', 'general', 'normal', true, true, 25, null],
    ['Parking Notice', 'Overflow parking is now at the school field on busy Sabbaths. Follow usher directions.', 'urgent', 'normal', true, true, 10, null],
    ['Draft: End-Year Program Plan', 'Internal draft — program outline for the December festivities (unpublished).', 'general', 'normal', false, false, 45, null],
    ['Expired: September Cleanup', 'This announcement lapsed last month and is kept for records.', 'general', 'low', true, true, -30, null],
    ['Youth Retreat Payment Deadline', 'Final instalment for the youth retreat is due this Friday. See the youth leader.', 'department', 'high', true, true, 6, dept],
    ['Sabbath School Teachers Meeting', 'All Sabbath School teachers meet after divine service for quarterly review.', 'department', 'normal', true, false, 8, dept],
    ['Church Directory Update', 'Submit updated contact details to the clerk for the 2027 directory.', 'general', 'normal', true, true, 60, null],
    ['Wedding Announcement', 'Congratulations to Bro. Kiprop and Sis. Wanjiru — ceremony in 3 weeks, all invited.', 'general', 'normal', true, true, 22, null],
    ['Evangelistic Series Volunteers', 'Ushers, interpreters and hospitality team needed for the evangelistic series.', 'event', 'high', true, true, 26, null],
    ['Deacons Work Bee', 'Church maintenance work bee this Sunday 8am — bring tools and gloves.', 'department', 'normal', true, false, 4, dept],
    ['Adventist Men Organization Breakfast', 'AMO breakfast meeting Sunday 7am at the church hall. KES 300 per person.', 'department', 'normal', true, true, 9, dept],
    ['Funeral Arrangements: Elder Kariuki', 'Funeral service for Elder Kariuki is Thursday 10am. Visitation at his home Wednesday.', 'urgent', 'high', true, true, 3, null],
    ['Vacation Bible School', 'Children\'s VBS runs first week of the school holiday — register at the children\'s desk.', 'department', 'normal', true, true, 35, dept],
    ['Treasury Office Hours Change', 'Treasurer now available Sundays 10am–12pm for receipts and statements.', 'financial', 'low', true, true, 45, null],
    ['Public Holiday Schedule', 'Church office closed Monday for the public holiday. Emergency contacts on the noticeboard.', 'general', 'low', true, true, 7, null],
  ];

  for (const [title, content, type, priority, published, pub, expDays, d] of rows) {
    await insertUnless('announcements',
      'church_id = $1 AND title = $2',
      [churchId, title],
      {
        title, content,
        announcement_type: type,
        department_id: d || null,
        author_id: ctx.pastorId,
        is_public: pub,
        priority,
        expires_at: expDays < 0 ? daysAgo(-expDays) : daysAhead(expDays),
        is_published: published,
        church_id: churchId,
      });
  }
}

// ---------------------------------------------------------------------------
// Payments — 6 months of realistic giving
// ---------------------------------------------------------------------------

async function seedPayments(churchId, ctx) {
  // payments.member_id FKs to users.id (despite the column name)
  const members = (await pool.query(
    `SELECT id AS member_id, id AS user_id, phone_number AS phone FROM users
     WHERE church_id = $1 ORDER BY created_at LIMIT 40`, [churchId])).rows;
  if (!members.length) return;

  const categories = [
    ['Tithe', 0.45, [2000, 10000]],
    ['Offering', 0.30, [100, 1500]],
    ['Building Fund', 0.12, [500, 5000]],
    ['Thanksgiving', 0.06, [500, 3000]],
    ['Camp Meeting', 0.05, [1000, 5000]],
    ['Mission Offering', 0.02, [200, 800]],
  ];
  const methods = [['mpesa', 0.7], ['cash', 0.2], ['bank', 0.1]];
  const pick = pairs => {
    let r = Math.random(), acc = 0;
    for (const [v, p] of pairs) { acc += p; if (r <= acc) return v; }
    return pairs[0][0];
  };
  const rand = (min, max) => Math.round((min + Math.random() * (max - min)) / 50) * 50;

  // ~90 payments across the last 26 weeks — weekly clusters per member
  for (let i = 0; i < 90; i++) {
    const m = members[i % members.length];
    const [cat, , range] = categories[Math.floor(Math.random() * categories.length)];
    const method = pick(methods);
    const daysBack = Math.floor(Math.random() * 180);
    const status = Math.random() < 0.92 ? 'completed' : (Math.random() < 0.6 ? 'pending' : 'failed');
    const marker = `SEED-KMS-${String(i).padStart(3, '0')}`;
    const amount = rand(range[0], range[1]);

    await insertUnless('payments',
      'church_id = $1 AND notes = $2',
      [churchId, marker],
      {
        member_id: m.user_id,
        user_id: m.user_id,
        phone_number: m.phone || '0712000000',
        amount,
        payment_date: daysAgo(daysBack),
        status,
        payment_method: method,
        notes: marker,
        church_id: churchId,
        category: cat,
        payment_type: method,
        currency: 'KES',
        initiated_by: m.user_id,
        processed_by: status === 'completed' ? ctx.treasurerId : null,
        mpesa_receipt_number: method === 'mpesa' && status === 'completed'
          ? `Q${marker.slice(-7)}${Math.random().toString(36).slice(2, 5).toUpperCase()}` : null,
        reference_number: `REF-${marker}`,
        failure_reason: status === 'failed' ? 'Request cancelled by user' : null,
        completed_at: status === 'completed' ? daysAgo(daysBack) : null,
      });
  }
}

// ---------------------------------------------------------------------------
// Rewire event-linked seed rows that were inserted with event_id NULL
// ---------------------------------------------------------------------------

async function linkEventRows(churchId) {
  const ev = await one(`SELECT id FROM events WHERE church_id = $1 ORDER BY event_date LIMIT 1`, [churchId]);
  if (!ev) return;
  const r1 = await pool.query(
    `UPDATE member_attendance SET event_id = $1 WHERE church_id = $2 AND event_id IS NULL`, [ev.id, churchId]);
  const r2 = await pool.query(
    `UPDATE event_collections SET event_id = $1 WHERE church_id = $2 AND event_id IS NULL`, [ev.id, churchId]);
  const r3 = await pool.query(
    `UPDATE program_contributions SET event_id = $1 WHERE church_id = $2 AND event_id IS NULL`, [ev.id, churchId]);
  if (r1.rowCount + r2.rowCount + r3.rowCount > 0) {
    console.log(`  linked: ${r1.rowCount} attendance, ${r2.rowCount} collections, ${r3.rowCount} program contributions → real event`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const church = await one(`SELECT id, slug FROM churches WHERE slug = $1`, [CHURCH_SLUG]);
  if (!church) throw new Error(`church ${CHURCH_SLUG} not found`);
  console.log(`Filling ${church.slug}...`);

  const pickUser = async role => one(
    `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
     WHERE u.church_id = $1 AND r.name = $2 ORDER BY u.created_at LIMIT 1`, [church.id, role]);
  const ctx = {
    pastorId: (await pickUser('Pastor'))?.id || (await one(`SELECT id FROM users WHERE church_id = $1 ORDER BY created_at LIMIT 1`, [church.id]))?.id,
    treasurerId: (await pickUser('Treasurer'))?.id,
    departmentId: (await one(`SELECT id FROM departments WHERE church_id = $1 ORDER BY created_at LIMIT 1`, [church.id]))?.id,
  };

  await seedEvents(church.id, ctx);
  await seedAnnouncements(church.id, ctx);
  await seedPayments(church.id, ctx);
  await linkEventRows(church.id);

  const counts = await one(
    `SELECT (SELECT count(*)::int FROM events WHERE church_id=$1) e,
            (SELECT count(*)::int FROM announcements WHERE church_id=$1) a,
            (SELECT count(*)::int FROM payments WHERE church_id=$1) p`, [church.id]);
  console.log(`Done: ${inserted} inserted, ${skipped} existed. Totals → events:${counts.e} announcements:${counts.a} payments:${counts.p}`);
}

main()
  .then(() => pool.end())
  .catch(err => { console.error('FILL FAILED:', err); pool.end(); process.exit(1); });
