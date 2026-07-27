const { pool } = require('./config/database');

async function runGlobalUsernameMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting global username constraint migration...');
    
    // Check if username column exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'username'
        ) THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(50);
        END IF;
      END $$;
    `);
    console.log('✓ Username column verified/added');
    
    // Drop existing constraint if it exists
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'users' AND constraint_name = 'users_username_key'
        ) THEN
          ALTER TABLE users DROP CONSTRAINT users_username_key;
        END IF;
      END $$;
    `);
    console.log('✓ Existing constraint dropped if present');
    
    // Add unique constraint on username (global uniqueness)
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
    `);
    console.log('✓ Global username unique constraint added');
    
    // Create index for faster username lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    console.log('✓ Username index created');
    
    // Handle any existing duplicate usernames
    const duplicateResult = await client.query(`
      SELECT username, COUNT(*) as count 
      FROM users 
      WHERE username IS NOT NULL 
      GROUP BY username 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateResult.rows.length > 0) {
      console.log(`Found ${duplicateResult.rows.length} duplicate usernames, resolving...`);
      
      for (const duplicate of duplicateResult.rows) {
        const suffix = Math.floor(Math.random() * 1000) + 1;
        const newUsername = `${duplicate.username}_${suffix}`;
        
        await client.query(`
          UPDATE users 
          SET username = $1 
          WHERE id = (
            SELECT id FROM users 
            WHERE username = $2 
            LIMIT 1
          )
        `, [newUsername, duplicate.username]);
        
        console.log(`  Resolved duplicate username ${duplicate.username} -> ${newUsername}`);
      }
    }
    
    // Add comment to document the constraint
    await client.query(`
      COMMENT ON CONSTRAINT users_username_unique ON users IS 'Ensures username is globally unique across all churches';
    `);
    console.log('✓ Constraint documentation added');
    
    console.log('✅ Global username constraint migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
runGlobalUsernameMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });