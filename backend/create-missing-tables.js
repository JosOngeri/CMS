const { pool } = require('./config/database');

async function createMissingTables() {
  try {
    console.log('Creating missing tables for dashboard...');

    // Create transactions table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(20) NOT NULL,
        category_id INTEGER,
        amount NUMERIC NOT NULL,
        description TEXT,
        transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'pending',
        church_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created transactions table');

    // Create approval_requests table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        requested_by INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        church_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created approval_requests table');

    console.log('All missing tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating missing tables:', error);
    process.exit(1);
  }
}

createMissingTables();
