const { pool } = require('../config/database');

/**
 * Seeds 8 weeks of upcoming events for each seeded church
 * (Sabbath Service Saturdays, Midweek Prayer Wednesdays, plus specials).
 * Skips churches that already have upcoming events so it is safe to rerun.
 */
async function seedUpcoming() {
  const churches = (await pool.query(
    "SELECT id, slug, name FROM churches WHERE slug IN ('newlife','mount-horeb','kiserian-dam')"
  )).rows;
  const admin = (await pool.query(
    "SELECT id FROM users WHERE email='admin@kiseriansda.org'"
  )).rows[0];

  let inserted = 0;
  for (const c of churches) {
    const existing = await pool.query(
      'SELECT COUNT(*) FROM events WHERE church_id = $1 AND event_date >= CURRENT_DATE',
      [c.id]
    );
    if (parseInt(existing.rows[0].count) > 0) {
      console.log(`${c.name}: already has ${existing.rows[0].count} upcoming events, skipping`);
      continue;
    }

    for (let w = 0; w < 8; w++) {
      const sat = new Date();
      sat.setDate(sat.getDate() + (((6 - sat.getDay()) + 7) % 7 || 7) + w * 7);
      await pool.query(
        `INSERT INTO events (title, description, event_date, event_time, location, organizer_id, is_public, church_id)
         VALUES ('Sabbath Service', 'Weekly Sabbath worship service', $1, '09:00', 'Main Sanctuary', $2, true, $3)`,
        [sat, admin.id, c.id]
      );

      const wed = new Date(sat);
      wed.setDate(sat.getDate() - 3);
      await pool.query(
        `INSERT INTO events (title, description, event_date, event_time, location, organizer_id, is_public, church_id)
         VALUES ('Midweek Prayer Meeting', 'Wednesday evening prayer and Bible study', $1, '18:00', 'Fellowship Hall', $2, true, $3)`,
        [wed, admin.id, c.id]
      );
      inserted += 2;
    }

    const specials = [
      ['Youth Rally', 'Afternoon youth program with music and testimonies', 14],
      ['Communion Service', 'Quarterly communion and foot washing ceremony', 28],
      ['Health Expo', 'Community health screening and wellness talks', 42],
    ];
    for (const [title, desc, daysOut] of specials) {
      const d = new Date();
      d.setDate(d.getDate() + daysOut);
      await pool.query(
        `INSERT INTO events (title, description, event_date, event_time, location, organizer_id, is_public, church_id)
         VALUES ($1, $2, $3, '14:00', 'Main Sanctuary', $4, true, $5)`,
        [title, desc, d, admin.id, c.id]
      );
      inserted++;
    }
    console.log(`${c.name}: seeded upcoming events`);
  }

  console.log(`Done — ${inserted} upcoming events inserted`);
  await pool.end();
}

seedUpcoming().catch((e) => { console.error(e.message); process.exit(1); });
