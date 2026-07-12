const { pool } = require('../config/database');

async function assign() {
  try {
    const churchResult = await pool.query(
      "SELECT id, slug FROM churches WHERE slug = 'kiserian-main-sda' LIMIT 1"
    );
    if (!churchResult.rows[0]) {
      console.log('Demo church not found');
      await pool.end();
      return;
    }
    const { id: churchId, slug: churchSlug } = churchResult.rows[0];

    const result = await pool.query(
      `UPDATE users SET church_id = $1, church_slug = $2 WHERE church_id IS NULL`,
      [churchId, churchSlug]
    );
    console.log(`Assigned ${result.rowCount} user(s) to demo church`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

assign();
