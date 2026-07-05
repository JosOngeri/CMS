const { pool } = require('../config/database');

async function addMissingColumns() {
  try {
    console.log('Adding missing columns...');

    // Add 'used' column to refresh_tokens
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'refresh_tokens' AND column_name = 'used'
            ) THEN
                ALTER TABLE refresh_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE;
            END IF;
        END $$;
      `);
      console.log('✓ Added refresh_tokens.used column');
    } catch (error) {
      console.log('✗ refresh_tokens.used column:', error.message);
    }

    // Add 'is_active' column to documents
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'documents' AND column_name = 'is_active'
            ) THEN
                ALTER TABLE documents ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            END IF;
        END $$;
      `);
      console.log('✓ Added documents.is_active column');
    } catch (error) {
      console.log('✗ documents.is_active column:', error.message);
    }

    console.log('Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addMissingColumns();
