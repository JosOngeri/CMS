const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function seedPalettes() {
  try {
    console.log('Seeding color palettes...');

    // Define the 6 system palettes
    const palettes = [
      {
        name: 'church_blue',
        display_name: 'Church Blue',
        description: 'Classic blue and gold church theme',
        is_system: true,
        is_default: true,
        colors: {
          primary: '#2563eb',
          secondary: '#f59e0b',
          background: '#ffffff',
          surface: '#ffffff',
          text: '#111827',
          text_secondary: '#6b7280',
          border: '#e5e7eb',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      {
        name: 'royal_purple',
        display_name: 'Royal Purple',
        description: 'Elegant purple and gold theme',
        is_system: true,
        is_default: false,
        colors: {
          primary: '#7c3aed',
          secondary: '#fbbf24',
          background: '#faf5ff',
          surface: '#ffffff',
          text: '#1f2937',
          text_secondary: '#6b7280',
          border: '#e9d5ff',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      {
        name: 'forest_green',
        display_name: 'Forest Green',
        description: 'Natural green and amber theme',
        is_system: true,
        is_default: false,
        colors: {
          primary: '#059669',
          secondary: '#fcd34d',
          background: '#f0fdf4',
          surface: '#ffffff',
          text: '#1f2937',
          text_secondary: '#6b7280',
          border: '#bbf7d0',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      {
        name: 'ocean_teal',
        display_name: 'Ocean Teal',
        description: 'Calm teal and sky blue theme',
        is_system: true,
        is_default: false,
        colors: {
          primary: '#0d9488',
          secondary: '#38bdf8',
          background: '#f0fdfa',
          surface: '#ffffff',
          text: '#1f2937',
          text_secondary: '#6b7280',
          border: '#99f6e4',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      {
        name: 'warm_sunset',
        display_name: 'Warm Sunset',
        description: 'Warm orange and pink theme',
        is_system: true,
        is_default: false,
        colors: {
          primary: '#ea580c',
          secondary: '#f472b6',
          background: '#fff7ed',
          surface: '#ffffff',
          text: '#1f2937',
          text_secondary: '#6b7280',
          border: '#fed7aa',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      {
        name: 'modern_slate',
        display_name: 'Modern Slate',
        description: 'Modern slate and cyan theme',
        is_system: true,
        is_default: false,
        colors: {
          primary: '#475569',
          secondary: '#06b6d4',
          background: '#f8fafc',
          surface: '#ffffff',
          text: '#1e293b',
          text_secondary: '#64748b',
          border: '#cbd5e1',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      }
    ];

    for (const palette of palettes) {
      // Check if palette already exists
      const existing = await pool.query(
        'SELECT id FROM color_palettes WHERE name = $1',
        [palette.name]
      );

      let paletteId;
      if (existing.rows.length === 0) {
        // Insert palette
        const paletteResult = await pool.query(
          `INSERT INTO color_palettes (name, display_name, description, is_system, is_default)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [palette.name, palette.display_name, palette.description, palette.is_system, palette.is_default]
        );
        paletteId = paletteResult.rows[0].id;
        console.log(`Created palette: ${palette.display_name}`);
      } else {
        paletteId = existing.rows[0].id;
        console.log(`Palette already exists: ${palette.display_name}`);
      }

      // Insert colors
      for (const [colorKey, colorValue] of Object.entries(palette.colors)) {
        const existingColor = await pool.query(
          'SELECT id FROM color_palette_colors WHERE palette_id = $1 AND color_key = $2',
          [paletteId, colorKey]
        );

        if (existingColor.rows.length === 0) {
          await pool.query(
            `INSERT INTO color_palette_colors (palette_id, color_key, color_value)
             VALUES ($1, $2, $3)`,
            [paletteId, colorKey, colorValue]
          );
        }
      }
    }

    console.log('Color palettes seeded successfully!');
  } catch (error) {
    console.error('Error seeding palettes:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedPalettes();
