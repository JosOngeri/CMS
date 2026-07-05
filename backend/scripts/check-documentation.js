const { pool } = require('../config/database');

async function checkDocumentation() {
  try {
    console.log('Checking documentation table...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'documentation'
      )
    `);
    
    console.log('Documentation table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Check table structure
      const columnCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'documentation' 
        ORDER BY ordinal_position
      `);
      
      console.log('\nDocumentation table columns:');
      columnCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Check existing documents
      const docCount = await pool.query('SELECT COUNT(*) as count FROM documentation');
      console.log(`\nTotal documents: ${docCount.rows[0].count}`);

      // Sample documents
      const sampleDocs = await pool.query('SELECT id, title, category FROM documentation LIMIT 5');
      console.log('\nSample documents:');
      sampleDocs.rows.forEach(doc => {
        console.log(`  - ${doc.title} (${doc.category})`);
      });
    } else {
      console.log('\nDocumentation table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE documentation (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          category VARCHAR(100) DEFAULT 'user-guide',
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Documentation table created successfully.');
    }

  } catch (error) {
    console.error('Error checking documentation:', error.message);
  } finally {
    await pool.end();
  }
}

checkDocumentation();
