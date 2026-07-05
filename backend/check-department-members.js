const { pool } = require('./config/database');

async function checkDepartmentMembers() {
  try {
    console.log('Checking department_members table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'department_members' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in department_members table:');
    result.rows.forEach(row => console.log(`  - ${row.column_name}: ${row.data_type}`));
    
    await pool.end();
  } catch (error) {
    console.error('Error checking department_members:', error);
    await pool.end();
  }
}

checkDepartmentMembers();
