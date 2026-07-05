const BaseRepository = require('./BaseRepository');

class SEORepository extends BaseRepository {
  constructor() {
    super('seo_settings');
  }

  async getSettings() {
    const result = await this.pool.query('SELECT * FROM seo_settings WHERE id = 1');
    return result.rows[0] || {};
  }

  async updateSettings(data) {
    const { metaTitle, metaDescription, keywords, ogImage, canonicalUrl, robots, sitemapEnabled } = data;

    const result = await this.pool.query(
      `UPDATE seo_settings
       SET meta_title = $1, meta_description = $2, keywords = $3, og_image = $4,
           canonical_url = $5, robots = $6, sitemap_enabled = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [metaTitle, metaDescription, keywords, ogImage, canonicalUrl, robots, sitemapEnabled]
    );
    return result.rows[0];
  }
}

module.exports = new SEORepository();
