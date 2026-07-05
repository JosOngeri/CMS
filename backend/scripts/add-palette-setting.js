const { pool } = require('../config/database');

async function addPaletteSetting() {
  try {
    console.log('Adding selected_palette setting...');
    
    const validationRules = JSON.stringify({
      enum: ["church_blue", "royal_purple", "forest_green", "ocean_teal", "warm_sunset", "modern_slate", "custom"]
    });

    await pool.query(
      `INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
       VALUES ('selected_palette', 'church_blue', 'string', 'appearance', 'Selected Color Palette', 'The color palette applied to the site', true, true, $1)
       ON CONFLICT (key) DO NOTHING`,
      [validationRules]
    );

    console.log('selected_palette setting added successfully!');
  } catch (error) {
    console.error('Error adding setting:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addPaletteSetting();
