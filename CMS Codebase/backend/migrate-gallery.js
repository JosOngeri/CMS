require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function migrateGallery() {
  try {
    console.log('Migrating Gallery schema...');

    const schemaPath = path.join(__dirname, 'migrations', '004_gallery_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log('Gallery schema migrated successfully!');
  } catch (error) {
    console.error('Error migrating Gallery schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateGallery();
