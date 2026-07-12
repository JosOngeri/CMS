const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDemoData() {
  try {
    // Find admin user
    const adminResult = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@sda.org' LIMIT 1"
    );
    const adminId = adminResult.rows[0]?.id;

    // Seed departments if none exist
    const deptCount = await pool.query('SELECT COUNT(*) as total FROM departments');
    if (parseInt(deptCount.rows[0].total) === 0) {
      const departments = [
        { name: 'Praise & Worship', description: 'Music, choir, and worship ministry', category: 'worship' },
        { name: 'Media & Communications', description: 'Sound, video, livestream, and social media', category: 'media' },
        { name: 'Youth Ministry', description: 'Youth programs, Pathfinders, and young adults', category: 'youth' },
        { name: 'Community Service', description: 'Outreach, charity, and community programs', category: 'outreach' },
      ];

      for (const dept of departments) {
        await pool.query(
          `INSERT INTO departments (name, description, category, head_id, is_active, slug)
           VALUES ($1, $2, $3, $4, true, gen_random_uuid())
           ON CONFLICT (name) DO NOTHING`,
          [dept.name, dept.description, dept.category, adminId || null]
        );
      }
      console.log('Seeded departments:', departments.length);
    } else {
      console.log('Departments already exist, skipping.');
    }

    // Seed announcements if none exist
    const annCount = await pool.query('SELECT COUNT(*) as total FROM announcements');
    if (parseInt(annCount.rows[0].total) === 0) {
      const announcements = [
        { title: 'Welcome to KMainCMS', content: 'We are now using the new church management system. Please update your profiles.', priority: 'high' },
        { title: 'Sabbath Service Schedule', content: 'Sabbath school begins at 8:30 AM, Divine service at 11:00 AM.', priority: 'normal' },
        { title: 'Youth Camp Registration', content: 'Register for the upcoming youth camp by end of the month.', priority: 'normal' },
      ];

      for (const ann of announcements) {
        await pool.query(
          `INSERT INTO announcements (title, content, announcement_type, author_id, priority, is_public, expires_at)
           VALUES ($1, $2, 'general', $3, $4, true, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
          [ann.title, ann.content, adminId || null, ann.priority]
        );
      }
      console.log('Seeded announcements:', announcements.length);
    } else {
      console.log('Announcements already exist, skipping.');
    }

    // Seed gallery albums if none exist
    const albumCount = await pool.query('SELECT COUNT(*) as total FROM gallery_albums');
    if (parseInt(albumCount.rows[0].total) === 0) {
      await pool.query(
        `INSERT INTO gallery_albums (name, description, created_by, is_public, church_id)
         VALUES ('Sabbath Highlights', 'Moments from recent Sabbath services', $1, true, NULL)`,
        [adminId || null]
      );
      console.log('Seeded gallery albums: 1');
    } else {
      console.log('Gallery albums already exist, skipping.');
    }

    console.log('Demo data seeding complete.');
  } catch (error) {
    console.error('Error seeding demo data:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

seedDemoData();
