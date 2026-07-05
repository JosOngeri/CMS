const { pool } = require('./config/database');

async function checkTables() {
  try {
    console.log('Checking database tables...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Tables in database:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    await pool.end();
  } catch (error) {
    console.error('Error checking tables:', error);
    await pool.end();
  }
}

checkTables();
