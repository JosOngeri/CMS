const { pool } = require('../config/database');

async function check() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('notifications','notification_types','notification_preferences','notification_templates','notification_logs')"
    );
    console.log(result.rows.map(r => r.table_name).join(', '));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
