const BaseRepository = require('./BaseRepository');

class GalleryRepository extends BaseRepository {
  constructor() {
    super('gallery_photos');
  }

  async getRecent(churchId = null, limit = 20) {
    let query = `
      SELECT gp.*, ga.title as album_name
      FROM ${this.tableName} gp
      LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND gp.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY gp.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByAlbum(albumId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE album_id = $1`;
    const params = [albumId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAlbums(churchId = null) {
    let query = `SELECT * FROM gallery_albums WHERE 1=1`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAlbumById(albumId, churchId = null) {
    let query = `SELECT * FROM gallery_albums WHERE id = $1`;
    const params = [albumId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getTags(churchId = null) {
    let query = `SELECT * FROM photo_tags ORDER BY name`;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getByTag(tagId, churchId = null) {
    let query = `
      SELECT gp.*, ga.title as album_name
      FROM ${this.tableName} gp
      LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
      JOIN photo_tag_assignments pta ON gp.id = pta.photo_id
      WHERE pta.tag_id = $1
    `;
    const params = [tagId];

    if (churchId) {
      query += ` AND gp.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY gp.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAllAlbumsWithPhotoCount(churchId = null) {
    let query = `
      SELECT ga.*,
       (SELECT COUNT(*) FROM gallery_photos gp WHERE gp.album_id = ga.id) as photo_count
       FROM gallery_albums ga
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE ga.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY ga.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAlbumWithPhotos(albumId, churchId = null) {
    const album = await this.getAlbumById(albumId, churchId);

    if (!album) {
      return null;
    }

    const photosResult = await this.pool.query(
      `SELECT gp.*, u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM gallery_photos gp
       LEFT JOIN users u ON gp.uploaded_by = u.id
       WHERE gp.album_id = $1
       ORDER BY gp.order_index, gp.uploaded_at DESC`,
      [albumId]
    );

    return {
      ...album,
      photos: photosResult.rows
    };
  }

  async getCategories() {
    const result = await this.pool.query(
      `SELECT DISTINCT title as category
       FROM gallery_albums
       WHERE title IS NOT NULL
       ORDER BY title`
    );
    return result.rows.map(row => row.category);
  }

  async createAlbum(title, description, coverPhotoId, userId, churchId, churchSlug, isPublic = true) {
    const result = await this.pool.query(
      `INSERT INTO gallery_albums (title, description, cover_photo_id, created_by, church_id, church_slug, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, coverPhotoId, userId, churchId, churchSlug, !isPublic]
    );
    return result.rows[0];
  }

  async updateAlbum(id, title, description, coverPhotoId, isPublic) {
    const result = await this.pool.query(
      `UPDATE gallery_albums
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           cover_photo_id = COALESCE($3, cover_photo_id),
           is_private = COALESCE($4, is_private),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, description, coverPhotoId, isPublic !== undefined ? !isPublic : undefined, id]
    );
    return result.rows[0];
  }

  async deleteAlbum(id) {
    await this.pool.query('DELETE FROM gallery_albums WHERE id = $1', [id]);
  }

  async uploadPhoto(albumId, title, description, fileUrl, thumbnailUrl, fileSize, fileType, width, height, telegramFileId, telegramFileUniqueId, userId) {
    const result = await this.pool.query(
      `INSERT INTO gallery_photos (album_id, title, description, file_url, thumbnail_url, file_size, file_type, width, height, telegram_file_id, telegram_file_unique_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [albumId, title, description, fileUrl, thumbnailUrl, fileSize, fileType, width, height, telegramFileId, telegramFileUniqueId, userId]
    );
    return result.rows[0];
  }

  async updatePhoto(id, title, description, isFeatured, orderIndex) {
    const result = await this.pool.query(
      `UPDATE gallery_photos
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           is_featured = COALESCE($3, is_featured),
           order_index = COALESCE($4, order_index)
       WHERE id = $5
       RETURNING *`,
      [title, description, isFeatured, orderIndex, id]
    );
    return result.rows[0];
  }

  async deletePhoto(id) {
    await this.pool.query('DELETE FROM gallery_photos WHERE id = $1', [id]);
  }

  async addTagToPhoto(photoId, tagId) {
    await this.pool.query(
      'INSERT INTO photo_tag_assignments (photo_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [photoId, tagId]
    );
  }

  async removeTagFromPhoto(photoId, tagId) {
    await this.pool.query(
      'DELETE FROM photo_tag_assignments WHERE photo_id = $1 AND tag_id = $2',
      [photoId, tagId]
    );
  }

  async getComments(photoId) {
    const result = await this.pool.query(
      `SELECT gc.*, u.first_name || ' ' || u.last_name as author_name
       FROM gallery_comments gc
       JOIN users u ON gc.user_id = u.id
       WHERE gc.photo_id = $1
       ORDER BY gc.created_at DESC`,
      [photoId]
    );
    return result.rows;
  }

  async addComment(photoId, userId, comment) {
    const result = await this.pool.query(
      `INSERT INTO gallery_comments (photo_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [photoId, userId, comment]
    );
    return result.rows[0];
  }

  async searchPhotos(searchPattern, limit, offset) {
    const result = await this.pool.query(
      `SELECT DISTINCT gp.*, 
              u.first_name || ' ' || u.last_name as uploaded_by_name,
              ga.title as album_title
       FROM gallery_photos gp
       LEFT JOIN users u ON gp.uploaded_by = u.id
       LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
       LEFT JOIN photo_tag_assignments pta ON gp.id = pta.photo_id
       LEFT JOIN photo_tags pt ON pta.tag_id = pt.id
       WHERE gp.title ILIKE $1
          OR gp.description ILIKE $1
          OR pt.name ILIKE $1
       ORDER BY gp.uploaded_at DESC
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );
    return result.rows;
  }

  async filterPhotosByTags(tagIds, limit, offset) {
    const placeholders = tagIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT DISTINCT gp.*, 
              u.first_name || ' ' || u.last_name as uploaded_by_name,
              ga.title as album_title,
              array_agg(DISTINCT pt.name) as tag_names
       FROM gallery_photos gp
       LEFT JOIN users u ON gp.uploaded_by = u.id
       LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
       JOIN photo_tag_assignments pta ON gp.id = pta.photo_id
       JOIN photo_tags pt ON pta.tag_id = pt.id
       WHERE pta.tag_id IN (${placeholders})
       GROUP BY gp.id, u.first_name, u.last_name, ga.title
       ORDER BY gp.uploaded_at DESC
       LIMIT $${tagIds.length + 1} OFFSET $${tagIds.length + 2}
    `;
    
    const params = [...tagIds, limit, offset];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async filterPhotosByDate(startDate, endDate, limit, offset) {
    let query = `
      SELECT gp.*, 
             u.first_name || ' ' || u.last_name as uploaded_by_name,
             ga.title as album_title
      FROM gallery_photos gp
      LEFT JOIN users u ON gp.uploaded_by = u.id
      LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND gp.uploaded_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND gp.uploaded_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY gp.uploaded_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async updatePhotoMetadata(photoId, camera, location, iso, aperture, shutter_speed) {
    const result = await this.pool.query(
      `UPDATE gallery_photos 
       SET camera = COALESCE($1, camera),
           location = COALESCE($2, location),
           iso = COALESCE($3, iso),
           aperture = COALESCE($4, aperture),
           shutter_speed = COALESCE($5, shutter_speed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [camera, location, iso, aperture, shutter_speed, photoId]
    );
    return result.rows[0];
  }

  async updatePhotoPrivacy(photoId, is_private, allowed_roles) {
    const result = await this.pool.query(
      `UPDATE gallery_photos 
       SET is_private = COALESCE($1, is_private),
           allowed_roles = COALESCE($2, allowed_roles),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [is_private, allowed_roles, photoId]
    );
    return result.rows[0];
  }

  async getPhotoAnalytics(photoId) {
    const viewResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM gallery_photo_views WHERE photo_id = $1',
      [photoId]
    );

    const downloadResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM gallery_photo_downloads WHERE photo_id = $1',
      [photoId]
    );

    const commentResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM gallery_comments WHERE photo_id = $1',
      [photoId]
    );

    const shareResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM gallery_photo_shares WHERE photo_id = $1',
      [photoId]
    );

    return {
      views: parseInt(viewResult.rows[0].count),
      downloads: parseInt(downloadResult.rows[0].count),
      comments: parseInt(commentResult.rows[0].count),
      shares: parseInt(shareResult.rows[0].count)
    };
  }

  async recordPhotoDownload(photoId, userId) {
    await this.pool.query(
      `INSERT INTO gallery_photo_downloads (photo_id, user_id, downloaded_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [photoId, userId]
    );
  }

  async sharePhoto(photoId, userId, platform, recipient) {
    await this.pool.query(
      `INSERT INTO gallery_photo_shares (photo_id, user_id, platform, recipient, shared_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [photoId, userId, platform, recipient]
    );
  }

  async getGalleryAnalytics(startDate, endDate) {
    const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM gallery_photos');

    const albumResult = await this.pool.query(
      `SELECT ga.title, COUNT(gp.id) as count 
       FROM gallery_albums ga 
       LEFT JOIN gallery_photos gp ON ga.id = gp.album_id 
       GROUP BY ga.title`
    );

    let trendQuery = `
      SELECT DATE(uploaded_at) as date, COUNT(*) as count 
      FROM gallery_photos 
      WHERE uploaded_at IS NOT NULL
    `;
    const trendParams = [];

    if (startDate) {
      trendQuery += ` AND uploaded_at >= $1`;
      trendParams.push(startDate);
    }
    if (endDate) {
      trendQuery += ` AND uploaded_at <= $2`;
      trendParams.push(endDate);
    }

    trendQuery += ` GROUP BY DATE(uploaded_at) ORDER BY date DESC LIMIT 30`;
    const trendResult = await this.pool.query(trendQuery, trendParams);

    return {
      total_photos: parseInt(totalResult.rows[0].count),
      photos_by_album: albumResult.rows,
      upload_trends: trendResult.rows
    };
  }

  async executePaginatedQuery(query, params) {
    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

module.exports = new GalleryRepository();
