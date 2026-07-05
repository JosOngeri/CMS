const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'kmaincms', 
  user: 'postgres', 
  password: 'postgres' 
});

async function checkTelegramTables() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%telegram%'"
    );
    
    if (result.rows.length > 0) {
      console.log('Telegram tables:', result.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('No Telegram tables found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTelegramTables();
