require('dotenv').config();
const { pool } = require('../config/database');
(async () => {
  for (const t of ['department_permissions', 'department_subcommittees', 'department_activities', 'departments', 'roles', 'user_roles', 'department_members', 'department_leadership', 'department_handovers']) {
    try {
      const r = await pool.query("SELECT string_agg(column_name, ', ') c FROM information_schema.columns WHERE table_name = $1", [t]);
      console.log(`\n${t.toUpperCase()}:\n  ${r.rows[0].c || 'MISSING TABLE'}`);
    } catch (e) { console.log(`\n${t}: ERROR ${e.message}`); }
  }
  process.exit(0);
})();
