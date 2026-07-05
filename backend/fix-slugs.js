const { pool } = require('./config/database');

async function fixSlugs() {
  const client = await pool.connect();
  try {
    console.log('Checking current department slugs...');
    const currentSlugs = await client.query('SELECT id, name, slug FROM departments');
    console.log('Current departments:');
    currentSlugs.rows.forEach(dept => {
      console.log(`  ${dept.name}: ${dept.slug || 'NULL'}`);
    });

    console.log('\nAdding slug column if not exists...');
    await client.query(`
      ALTER TABLE departments
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE
    `);

    console.log('Creating slug generation function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_slug(text VARCHAR) RETURNS VARCHAR AS $$
      BEGIN
        RETURN lower(regexp_replace(regexp_replace(text, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));
      END;
      $$ LANGUAGE plpgsql
    `);

    console.log('Generating slugs for departments without them...');
    const updateResult = await client.query(`
      UPDATE departments
      SET slug = generate_slug(name)
      WHERE slug IS NULL OR slug = ''
      RETURNING id, name, slug
    `);
    console.log(`Updated ${updateResult.rows.length} departments with slugs:`);
    updateResult.rows.forEach(dept => {
      console.log(`  ${dept.name}: ${dept.slug}`);
    });

    console.log('\nHandling duplicate slugs...');
    await client.query(`
      DO $$
      DECLARE
        dept RECORD;
        counter INTEGER;
        new_slug VARCHAR(100);
      BEGIN
        FOR dept IN SELECT id, name, slug FROM departments WHERE slug IS NOT NULL LOOP
          counter := 1;
          new_slug := dept.slug;

          WHILE EXISTS (SELECT 1 FROM departments WHERE slug = new_slug AND id != dept.id) LOOP
            new_slug := dept.slug || '_' || counter;
            counter := counter + 1;
          END LOOP;

          IF new_slug != dept.slug THEN
            UPDATE departments SET slug = new_slug WHERE id = dept.id;
          END IF;
        END LOOP;
      END $$
    `);

    console.log('\nFinal department slugs:');
    const finalSlugs = await client.query('SELECT id, name, slug FROM departments ORDER BY name');
    finalSlugs.rows.forEach(dept => {
      console.log(`  ${dept.name}: ${dept.slug}`);
    });

    console.log('\nSlug fix completed successfully!');
  } catch (error) {
    console.error('Error fixing slugs:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSlugs().catch(console.error);
