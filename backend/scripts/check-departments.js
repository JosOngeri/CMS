const { pool } = require('../config/database');

async function checkDepartments() {
  try {
    console.log('Checking departments table...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'departments'
      )
    `);
    
    console.log('Departments table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Check table structure
      const columnCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'departments' 
        ORDER BY ordinal_position
      `);
      
      console.log('\nDepartments table columns:');
      columnCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Check total departments
      const totalDepts = await pool.query('SELECT COUNT(*) as count FROM departments');
      console.log(`\nTotal departments: ${totalDepts.rows[0].count}`);

      // Check active departments
      const activeDepts = await pool.query('SELECT COUNT(*) as count FROM departments WHERE is_active = true');
      console.log(`Active departments: ${activeDepts.rows[0].count}`);

      // Sample departments
      const sampleDepts = await pool.query('SELECT id, name, category, is_active FROM departments LIMIT 5');
      console.log('\nSample departments:');
      sampleDepts.rows.forEach(dept => {
        console.log(`  - ${dept.name} (${dept.category}) - Active: ${dept.is_active}`);
      });
    } else {
      console.log('\nDepartments table does not exist.');
    }

  } catch (error) {
    console.error('Error checking departments:', error.message);
  } finally {
    await pool.end();
  }
}

checkDepartments();
