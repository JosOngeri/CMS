const { pool } = require('../config/database');

async function create() {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_user_slug(first_name VARCHAR, last_name VARCHAR, user_id UUID)
      RETURNS VARCHAR AS $$
      DECLARE
        base_slug VARCHAR;
      BEGIN
        base_slug := lower(regexp_replace(coalesce(first_name, '') || '-' || coalesce(last_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
        base_slug := trim(both '-' from base_slug);
        IF base_slug = '' OR base_slug = '-' THEN
          base_slug := 'user';
        END IF;
        RETURN base_slug || '-' || substr(user_id::text, 1, 8);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('Created generate_user_slug function');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

create();
