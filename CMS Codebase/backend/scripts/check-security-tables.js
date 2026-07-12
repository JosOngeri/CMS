const { pool } = require('../config/database');

async function check() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('security_logs','failed_login_attempts','blocked_ips','user_sessions','security_settings')"
    );
    console.log(result.rows.map(r => r.table_name).join(', '));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
