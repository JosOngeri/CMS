require('dotenv').config();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting comprehensive seeding...');
    await client.query('BEGIN');

    // 1. Clear existing dynamic data (but keep roles/categories seeded by schema)
    console.log('Cleaning existing data...');
    await client.query('TRUNCATE users, members, departments, announcements, events, payments, sms_logs, sms_templates CASCADE');

    // 2. Get Role IDs
    const rolesRes = await client.query('SELECT id, name FROM roles');
    const roles = {};
    rolesRes.rows.forEach(r => roles[r.name] = r.id);

    const passwordHash = await bcrypt.hash('password123', 12);

    // 3. Create Users
    console.log('Creating users...');
    const users = [];
    const userData = [
      { email: 'admin@kmaincms.org', first: 'Super', last: 'Admin', role: 'Super Admin', username: 'admin' },
      { email: 'pastor@kmaincms.org', first: 'John', last: 'Pastor', role: 'Pastor', username: 'pastor' },
      { email: 'treasurer@kmaincms.org', first: 'Jane', last: 'Treasurer', role: 'Treasurer', username: 'treasurer' },
      { email: 'youth.head@kmaincms.org', first: 'David', last: 'Youth', role: 'Department Head', username: 'youthhead' },
      { email: 'member@kmaincms.org', first: 'Samuel', last: 'Member', role: 'Member', username: 'member1' }
    ];

    for (const u of userData) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, username, phone, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, true, true) RETURNING id`,
        [u.email, passwordHash, u.first, u.last, u.username, '+254712345678']
      );
      const userId = res.rows[0].id;
      users.push({ ...u, id: userId });

      // Assign Role
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roles[u.role]]);
    }

    const admin = users.find(u => u.username === 'admin');
    const pastor = users.find(u => u.username === 'pastor');
    const treasurer = users.find(u => u.username === 'treasurer');
    const youthHead = users.find(u => u.username === 'youthhead');
    const member = users.find(u => u.username === 'member1');

    // 4. Create Members
    console.log('Creating member records...');
    for (const u of users) {
      await client.query(
        `INSERT INTO members (user_id, first_name, last_name, email, phone, membership_status, joined_date)
         VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE - INTERVAL '1 year')`,
        [u.id, u.first, u.last, u.email, '+254712345678']
      );
    }
    const memberRecordRes = await client.query('SELECT id FROM members WHERE email = $1', [member.email]);
    const memberRecordId = memberRecordRes.rows[0].id;

    // 5. Create Departments
    console.log('Creating departments...');
    const depts = [];
    const deptData = [
      { name: 'Youth Ministry', head: youthHead.id, slug: 'youth-ministry' },
      { name: 'Communications', head: admin.id, slug: 'communications' },
      { name: 'Treasury', head: treasurer.id, slug: 'treasury' }
    ];

    for (const d of deptData) {
      const res = await client.query(
        'INSERT INTO departments (name, head_id, slug, is_active) VALUES ($1, $2, $3, true) RETURNING id',
        [d.name, d.head, d.slug]
      );
      depts.push({ ...d, id: res.rows[0].id });
    }
    const youthDept = depts.find(d => d.slug === 'youth-ministry');

    // 6. Create Department Memberships
    console.log('Assigning department members...');
    await client.query(
      'INSERT INTO department_members (user_id, department_id, role, role_in_department, status) VALUES ($1, $2, $3, $4, $5)',
      [member.id, youthDept.id, 'Member', 'Youth Leader', 'approved']
    );

    // 7. Create Announcements
    console.log('Creating announcements...');
    await client.query(
      `INSERT INTO announcements (title, content, author_id, priority, is_public)
       VALUES ('General Meeting', 'There will be a general meeting this Sunday.', $1, 'high', true)`,
      [pastor.id]
    );

    // 8. Create Events
    console.log('Creating events...');
    await client.query(
      `INSERT INTO events (title, description, event_date, location, organizer_id, is_public)
       VALUES ('Youth Camp 2026', 'Annual youth spiritual retreat.', CURRENT_DATE + INTERVAL '30 days', 'Kiserian Camp Site', $1, true)`,
      [youthHead.id]
    );

    // 9. Create Payments
    console.log('Creating sample payments...');
    const catRes = await client.query("SELECT id FROM payment_categories WHERE name = 'Tithe'");
    const titheCatId = catRes.rows[0].id;

    await client.query(
      `INSERT INTO payments (member_id, amount, payment_type, category, status, reference_number, transaction_id)
       VALUES ($1, 5000, 'tithe', $2, 'completed', 'REF123456', 'TXN789012')`,
      [memberRecordId, titheCatId]
    );

    // 10. SMS Templates
    console.log('Creating SMS templates...');
    await client.query(
      `INSERT INTO sms_templates (name, content, template_type, created_by)
       VALUES ('Welcome SMS', 'Welcome to Kiserian Main SDA, {{name}}!', 'announcement', $1)`,
      [admin.id]
    );

    await client.query('COMMIT');
    console.log('✅ Comprehensive seeding completed successfully!');
    console.log('\nLogin Credentials (Password for all: password123):');
    users.forEach(u => console.log(`- ${u.role}: ${u.email}`));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
