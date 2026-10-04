const BaseRepository = require('./BaseRepository');

class PaletteRepository extends BaseRepository {
  constructor() {
    super('color_palettes');
  }

  async getAllWithColors(churchId = null) {
    // Tenant isolation: scoped callers see only their church's palettes;
    // unscoped callers (e.g. system email branding) see only global palettes.
    const params = churchId ? [churchId] : [];
    const query = `
      SELECT cp.*,
        json_object_agg(cpc.color_key, cpc.color_value) FILTER (WHERE cpc.color_key IS NOT NULL) as colors
       FROM color_palettes cp
       LEFT JOIN color_palette_colors cpc ON cp.id = cpc.palette_id
       WHERE ${churchId ? 'cp.church_id = $1' : 'cp.church_id IS NULL'}
       GROUP BY cp.id
       ORDER BY cp.is_default DESC, cp.display_name ASC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaletteWithColors(paletteId, churchId = null) {
    // Unscoped reads can only open global palettes — never a tenant's
    const params = churchId ? [paletteId, churchId] : [paletteId];
    const query = `
      SELECT cp.*,
        json_object_agg(cpc.color_key, cpc.color_value) FILTER (WHERE cpc.color_key IS NOT NULL) as colors
       FROM color_palettes cp
       LEFT JOIN color_palette_colors cpc ON cp.id = cpc.palette_id
       WHERE cp.id = $1
         AND ${churchId ? 'cp.church_id = $2' : 'cp.church_id IS NULL'}
       GROUP BY cp.id
    `;

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

  async findByName(name, churchId) {
    const result = await this.pool.query(
      'SELECT id FROM color_palettes WHERE name = $1 AND church_id = $2',
      [name, churchId]
    );
    return result.rows[0];
  }

  async createPalette(data) {
    const { name, display_name, description, created_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO color_palettes (name, display_name, description, is_system, is_default, created_by, church_id)
       VALUES ($1, $2, $3, false, false, $4, $5)
       RETURNING *`,
      [name, display_name, description, created_by, church_id]
    );
    return result.rows[0];
  }

  async createPaletteWithColors(data) {
    const { name, display_name, description, colors, created_by, church_id } = data;
    if (!church_id) throw new Error('createPaletteWithColors: church_id required');

    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert palette
      const paletteResult = await client.query(
        `INSERT INTO color_palettes (name, display_name, description, is_system, is_default, created_by, church_id)
         VALUES ($1, $2, $3, false, false, $4, $5)
         RETURNING *`,
        [name, display_name, description, created_by, church_id]
      );

      const palette = paletteResult.rows[0];

      // Insert colors in bulk — upsert so a duplicate (palette_id, color_key)
      // can never produce the duplicate-key json_object_agg hazard
      if (colors && Object.keys(colors).length > 0) {
        const colorEntries = Object.entries(colors);
        for (const [colorKey, colorValue] of colorEntries) {
          await client.query(
            `INSERT INTO color_palette_colors (palette_id, color_key, color_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (palette_id, color_key)
             DO UPDATE SET color_value = EXCLUDED.color_value`,
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
       VALUES ($1, $2, $3)
       ON CONFLICT (palette_id, color_key)
       DO UPDATE SET color_value = EXCLUDED.color_value
       RETURNING *`,
      [paletteId, colorKey, colorValue]
    );
    return result.rows[0];
  }

  async findById(id, churchId) {
    let query = 'SELECT * FROM color_palettes WHERE id = $1';
    const params = [id];
    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updatePalette(id, data, churchId) {
    if (!churchId) throw new Error('updatePalette: churchId required');
    const { display_name, description } = data;

    const result = await this.pool.query(
      `UPDATE color_palettes
       SET display_name = COALESCE($1, display_name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND church_id = $4`,
      [display_name, description, id, churchId]
    );
    return result.rows[0];
  }

  async updatePaletteWithColors(id, data, churchId) {
    if (!churchId) throw new Error('updatePaletteWithColors: churchId required');
    const { display_name, description, colors } = data;

    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update palette — scoped so a church can never mutate another's palette
      const upd = await client.query(
        `UPDATE color_palettes
         SET display_name = COALESCE($1, display_name),
             description = COALESCE($2, description),
             updated_at = NOW()
         WHERE id = $3 AND church_id = $4`,
        [display_name, description, id, churchId]
      );
      if (upd.rowCount === 0) {
        throw new Error('Palette not found in this church');
      }

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

  async deletePalette(id, churchId) {
    const result = await this.pool.query(
      'DELETE FROM color_palettes WHERE id = $1 AND church_id = $2',
      [id, churchId]
    );
    return result.rowCount > 0;
  }

  async resetAllDefaults(churchId) {
    if (!churchId) throw new Error('resetAllDefaults: churchId required');
    const result = await this.pool.query(
      'UPDATE color_palettes SET is_default = false WHERE church_id = $1',
      [churchId]
    );
    return result.rowCount;
  }

  async setDefault(id, churchId) {
    const result = await this.pool.query(
      'UPDATE color_palettes SET is_default = true WHERE id = $1 AND church_id = $2',
      [id, churchId]
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
