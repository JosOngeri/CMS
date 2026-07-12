const { pool } = require('./config/database');

async function createPersonalCollectionsTable() {
  try {
    console.log('Creating personal_collections table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS personal_collections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        fund VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ personal_collections table created successfully');

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_personal_collections_user_id 
      ON personal_collections(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_personal_collections_date 
      ON personal_collections(date DESC)
    `);

    console.log('✅ Indexes created successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createPersonalCollectionsTable();