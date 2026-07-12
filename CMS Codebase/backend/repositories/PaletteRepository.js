const BaseRepository = require('./BaseRepository');

class PaletteRepository extends BaseRepository {
  constructor() {
    super('color_palettes');
  }

  async getAllWithColors(churchId = null) {
    let query = `
      SELECT cp.*,
        json_object_agg(cpc.color_key, cpc.color_value) as colors
       FROM color_palettes cp
       LEFT JOIN color_palette_colors cpc ON cp.id = cpc.palette_id
       GROUP BY cp.id
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE cp.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY cp.is_default DESC, cp.display_name ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaletteWithColors(paletteId, churchId = null) {
    let query = `
      SELECT cp.*,
        json_object_agg(cpc.color_key, cpc.color_value) as colors
       FROM color_palettes cp
       LEFT JOIN color_palette_colors cpc ON cp.id = cpc.palette_id
       WHERE cp.id = $1
       GROUP BY cp.id
    `;
    const params = [paletteId];

    if (churchId) {
      query += ` AND cp.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDefaultPalette(churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE is_default = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getActivePalettes(churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY display_name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findByName(name) {
    const result = await this.pool.query(
      'SELECT id FROM color_palettes WHERE name = $1',
      [name]
    );
    return result.rows[0];
  }

  async createPalette(data) {
    const { name, display_name, description, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO color_palettes (name, display_name, description, is_system, is_default, created_by)
       VALUES ($1, $2, $3, false, false, $4)
       RETURNING *`,
      [name, display_name, description, created_by]
    );
    return result.rows[0];
  }

  async createPaletteWithColors(data) {
    const { name, display_name, description, colors, created_by } = data;

    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert palette
      const paletteResult = await client.query(
        `INSERT INTO color_palettes (name, display_name, description, is_system, is_default, created_by)
         VALUES ($1, $2, $3, false, false, $4)
         RETURNING *`,
        [name, display_name, description, created_by]
      );

      const palette = paletteResult.rows[0];

      // Insert colors in bulk
      if (colors && Object.keys(colors).length > 0) {
        const colorEntries = Object.entries(colors);
        for (const [colorKey, colorValue] of colorEntries) {
          await client.query(
            `INSERT INTO color_palette_colors (palette_id, color_key, color_value)
             VALUES ($1, $2, $3)`,
            [palette.id, colorKey, colorValue]
          );
        }
      }

      await client.query('COMMIT');
      client.release();

      return palette;
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  }

  async addColor(paletteId, colorKey, colorValue) {
    const result = await this.pool.query(
      `INSERT INTO color_palette_colors (palette_id, color_key, color_value)
       VALUES ($1, $2, $3)`,
      [paletteId, colorKey, colorValue]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT * FROM color_palettes WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async updatePalette(id, data) {
    const { display_name, description } = data;

    const result = await this.pool.query(
      `UPDATE color_palettes
       SET display_name = COALESCE($1, display_name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3`,
      [display_name, description, id]
    );
    return result.rows[0];
  }

  async updatePaletteWithColors(id, data) {
    const { display_name, description, colors } = data;

    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update palette
      await client.query(
        `UPDATE color_palettes
         SET display_name = COALESCE($1, display_name),
             description = COALESCE($2, description),
             updated_at = NOW()
         WHERE id = $3`,
        [display_name, description, id]
      );

      // Update colors if provided
      if (colors) {
        // Delete existing colors
        await client.query(
          'DELETE FROM color_palette_colors WHERE palette_id = $1',
          [id]
        );

        // Insert new colors
        const colorEntries = Object.entries(colors);
        for (const [colorKey, colorValue] of colorEntries) {
          await client.query(
            `INSERT INTO color_palette_colors (palette_id, color_key, color_value)
             VALUES ($1, $2, $3)`,
            [id, colorKey, colorValue]
          );
        }
      }

      await client.query('COMMIT');
      client.release();
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  }

  async removeAllColors(paletteId) {
    const result = await this.pool.query(
      'DELETE FROM color_palette_colors WHERE palette_id = $1',
      [paletteId]
    );
    return result.rowCount;
  }

  async deletePalette(id) {
    const result = await this.pool.query(
      'DELETE FROM color_palettes WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async resetAllDefaults() {
    const result = await this.pool.query(
      'UPDATE color_palettes SET is_default = false'
    );
    return result.rowCount;
  }

  async setDefault(id) {
    const result = await this.pool.query(
      'UPDATE color_palettes SET is_default = true WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async setUserPreference(userId, paletteId) {
    const result = await this.pool.query(
      'UPDATE user_settings SET setting_value = $1 WHERE user_id = $2 AND setting_key = $3',
      [paletteId, userId, 'preferred_palette']
    );
    return result.rows[0];
  }
}

module.exports = new PaletteRepository();
