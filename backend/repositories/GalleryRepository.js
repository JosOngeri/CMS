const BaseRepository = require('./BaseRepository');

class GalleryRepository extends BaseRepository {
  constructor() {
    super('gallery_photos');
  }

  async getRecent(churchId, limit = 20, approvedOnly = false) {
    if (!churchId) throw new Error('getRecent: churchId is required');
    let query = `
      SELECT gp.*, ga.title as album_name
      FROM ${this.tableName} gp
      LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
      WHERE 1=1
    `;
    const params = [];

    if (approvedOnly) {
      query += ` AND (gp.status = 'approved' OR gp.status IS NULL)`;
    }

    if (churchId) {
      query += ` AND gp.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY gp.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getById(id, churchId) {
    if (!churchId) throw new Error('getById: churchId is required');
    let query = `
      SELECT gp.*, ga.title as album_name
      FROM ${this.tableName} gp
      LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
      WHERE gp.id = $1
    `;
    const params = [id];

    if (churchId) {
      query += ` AND gp.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
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

  async getTags(churchId) {
    if (!churchId) throw new Error('GalleryRepository.getTags: churchId required');
    const result = await this.pool.query(
      'SELECT * FROM photo_tags WHERE church_id = $1 ORDER BY name', [churchId]);
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
       WHERE gp.album_id = $1 AND gp.church_id = $2
       ORDER BY gp.order_index, gp.uploaded_at DESC`,
      [albumId, churchId]
    );

    return {
      ...album,
      photos: photosResult.rows
    };
  }

  async getCategories(churchId) {
    if (!churchId) throw new Error('GalleryRepository.getCategories: churchId required');
    const result = await this.pool.query(
      `SELECT DISTINCT title as category
       FROM gallery_albums
       WHERE title IS NOT NULL AND church_id = $1
       ORDER BY title`, [churchId]
    );
    return result.rows.map(row => row.category);
  }

  async createAlbum(title, description, coverPhotoId, userId, churchId, churchSlug, isPublic = true) {
    // is_private and is_public mirror each other: the advanced album API
    // reads/writes is_public while this legacy path still speaks is_private.
    const result = await this.pool.query(
      `INSERT INTO gallery_albums (title, description, cover_photo_id, created_by, church_id, church_slug, is_private, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, coverPhotoId, userId, churchId, churchSlug, !isPublic, isPublic]
    );
    return result.rows[0];
  }

  async updateAlbum(id, title, description, coverPhotoId, isPublic, churchId) {
    if (!churchId) throw new Error('GalleryRepository.updateAlbum: churchId required');
    const result = await this.pool.query(
      `UPDATE gallery_albums
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           cover_photo_id = COALESCE($3, cover_photo_id),
           is_private = COALESCE($4, is_private),
           is_public = CASE WHEN $4 IS NULL THEN is_public ELSE NOT $4 END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND church_id = $6
       RETURNING *`,
      [title, description, coverPhotoId, isPublic !== undefined ? !isPublic : null, id, churchId]
    );
    return result.rows[0];
  }

  async deleteAlbum(id, churchId) {
    if (!churchId) throw new Error('GalleryRepository.deleteAlbum: churchId required');
    await this.pool.query('DELETE FROM gallery_albums WHERE id = $1 AND church_id = $2', [id, churchId]);
  }

  async uploadPhoto(albumId, title, description, fileUrl, thumbnailUrl, fileSize, fileType, width, height, telegramFileId, telegramFileUniqueId, userId, churchId) {
    if (!churchId) throw new Error('uploadPhoto: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO gallery_photos (album_id, title, description, file_url, thumbnail_url, file_size, file_type, width, height, telegram_file_id, telegram_file_unique_id, uploaded_by, church_id)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
       WHERE EXISTS (SELECT 1 FROM gallery_albums WHERE id = $1 AND church_id = $13)
       RETURNING *`,
      [albumId, title, description, fileUrl, thumbnailUrl, fileSize, fileType, width, height, telegramFileId, telegramFileUniqueId, userId, churchId]
    );
    const photo = result.rows[0];
    // Mirror the album link into album_photos — the advanced album API counts
    // membership through that join table, so both paths must agree.
    if (photo) {
      await this.pool.query(
        `INSERT INTO album_photos (album_id, photo_id, sort_order)
         SELECT $1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM album_photos WHERE album_id = $1)
         ON CONFLICT (album_id, photo_id) DO NOTHING`,
        [albumId, photo.id]
      );
    }
    return photo;
  }

  // Metadata-only photo record (used by GalleryContext.createPhoto — e.g. for
  // photos whose files already live on Telegram/external storage).
  async createPhoto(photoData, churchId) {
    if (!churchId) throw new Error('createPhoto: churchId is required');
    const {
      album_id, title, description, file_url, thumbnail_url, file_size,
      file_type, width, height, telegram_file_id, telegram_file_unique_id, uploaded_by
    } = photoData;
    const result = await this.pool.query(
      `INSERT INTO gallery_photos (album_id, title, description, file_url, thumbnail_url, file_size, file_type, width, height, telegram_file_id, telegram_file_unique_id, uploaded_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [album_id || null, title || null, description || null, file_url || null, thumbnail_url || null,
       file_size || null, file_type || null, width || null, height || null,
       telegram_file_id || null, telegram_file_unique_id || null, uploaded_by || null, churchId]
    );
    const photo = result.rows[0];
    if (photo && photo.album_id) {
      await this.pool.query(
        `INSERT INTO album_photos (album_id, photo_id, sort_order)
         SELECT $1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM album_photos WHERE album_id = $1)
         ON CONFLICT (album_id, photo_id) DO NOTHING`,
        [photo.album_id, photo.id]
      );
    }
    return photo;
  }

  // photo_tags is the table getTags reads — idempotent per church+name.
  async createTag(name, churchId) {
    if (!churchId) throw new Error('createTag: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO photo_tags (name, church_id)
       SELECT $1::varchar, $2::uuid
       WHERE NOT EXISTS (SELECT 1 FROM photo_tags WHERE church_id = $2::uuid AND LOWER(name) = LOWER($1::varchar))
       RETURNING *`,
      [name, churchId]
    );
    return result.rows[0] || (await this.pool.query(
      'SELECT * FROM photo_tags WHERE church_id = $1 AND LOWER(name) = LOWER($2)', [churchId, name]
    )).rows[0];
  }

  async updatePhoto(id, title, description, isFeatured, orderIndex, churchId) {
    if (!churchId) throw new Error('updatePhoto: churchId is required');
    const result = await this.pool.query(
      `UPDATE gallery_photos
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           is_featured = COALESCE($3, is_featured),
           order_index = COALESCE($4, order_index)
       WHERE id = $5 AND church_id = $6
       RETURNING *`,
      [title, description, isFeatured, orderIndex, id, churchId]
    );
    return result.rows[0];
  }

  async deletePhoto(id, churchId) {
    if (!churchId) throw new Error('deletePhoto: churchId is required');
    await this.pool.query('DELETE FROM gallery_photos WHERE id = $1 AND church_id = $2', [id, churchId]);
  }

  async addTagToPhoto(photoId, tagId, churchId) {
    if (!churchId) throw new Error('addTagToPhoto: churchId is required');
    await this.pool.query(
      `INSERT INTO photo_tag_assignments (photo_id, tag_id)
       SELECT $1, $2
       WHERE EXISTS (SELECT 1 FROM gallery_photos WHERE id = $1 AND church_id = $3)
         AND EXISTS (SELECT 1 FROM photo_tags WHERE id = $2 AND church_id = $3)
       ON CONFLICT DO NOTHING`,
      [photoId, tagId, churchId]
    );
  }

  async removeTagFromPhoto(photoId, tagId, churchId) {
    if (!churchId) throw new Error('removeTagFromPhoto: churchId is required');
    await this.pool.query(
      `DELETE FROM photo_tag_assignments WHERE photo_id = $1 AND tag_id = $2
       AND EXISTS (SELECT 1 FROM gallery_photos WHERE id = $1 AND church_id = $3)`,
      [photoId, tagId, churchId]
    );
  }

  async getComments(photoId, churchId) {
    if (!churchId) throw new Error('getComments: churchId is required');
    const result = await this.pool.query(
      `SELECT gc.*, u.first_name || ' ' || u.last_name as author_name
       FROM gallery_comments gc
       JOIN users u ON gc.user_id = u.id
       WHERE gc.photo_id = $1 AND gc.church_id = $2
       ORDER BY gc.created_at DESC`,
      [photoId, churchId]
    );
    return result.rows;
  }

  async addComment(photoId, userId, comment, churchId) {
    if (!churchId) throw new Error('addComment: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO gallery_comments (photo_id, user_id, comment, church_id)
       SELECT $1, $2, $3, $4
       WHERE EXISTS (SELECT 1 FROM gallery_photos WHERE id = $1 AND church_id = $4)
       RETURNING *`,
      [photoId, userId, comment, churchId]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Per-member favourites + private labels
  // ---------------------------------------------------------------------------

  async annotatePhotosForUser(photos, userId) {
    if (!userId || !Array.isArray(photos) || photos.length === 0) return photos;
    const ids = photos.map(p => p.id);
    const [favResult, labelResult] = await Promise.all([
      this.pool.query(
        'SELECT photo_id FROM gallery_favorites WHERE user_id = $1 AND photo_id = ANY($2)',
        [userId, ids]
      ),
      this.pool.query(
        'SELECT photo_id, label FROM gallery_photo_labels WHERE user_id = $1 AND photo_id = ANY($2)',
        [userId, ids]
      )
    ]);
    const favSet = new Set(favResult.rows.map(r => r.photo_id));
    const labelMap = {};
    for (const row of labelResult.rows) {
      (labelMap[row.photo_id] ||= []).push(row.label);
    }
    return photos.map(p => ({
      ...p,
      is_favorited: favSet.has(p.id),
      my_labels: labelMap[p.id] || []
    }));
  }

  async toggleFavorite(photoId, userId) {
    const existing = await this.pool.query(
      'SELECT id FROM gallery_favorites WHERE user_id = $1 AND photo_id = $2',
      [userId, photoId]
    );
    if (existing.rows.length > 0) {
      await this.pool.query(
        'DELETE FROM gallery_favorites WHERE user_id = $1 AND photo_id = $2',
        [userId, photoId]
      );
      return { favorited: false };
    }
    await this.pool.query(
      `INSERT INTO gallery_favorites (user_id, photo_id) VALUES ($1, $2)
       ON CONFLICT (user_id, photo_id) DO NOTHING`,
      [userId, photoId]
    );
    return { favorited: true };
  }

  async getFavoritesByUser(userId) {
    const result = await this.pool.query(
      `SELECT gp.*, ga.title as album_name, gf.created_at as favorited_at
       FROM gallery_favorites gf
       JOIN gallery_photos gp ON gf.photo_id = gp.id
       LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
       WHERE gf.user_id = $1 AND (gp.status = 'approved' OR gp.status IS NULL)
       ORDER BY gf.created_at DESC`,
      [userId]
    );
    return result.rows.map(p => ({ ...p, is_favorited: true }));
  }

  async addLabel(photoId, userId, label) {
    const clean = String(label).trim().slice(0, 100);
    if (!clean) return null;
    const result = await this.pool.query(
      `INSERT INTO gallery_photo_labels (user_id, photo_id, label)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, photo_id, label) DO NOTHING
       RETURNING *`,
      [userId, photoId, clean]
    );
    return result.rows[0] || { label: clean, photo_id: photoId };
  }

  async removeLabel(photoId, userId, label) {
    await this.pool.query(
      'DELETE FROM gallery_photo_labels WHERE user_id = $1 AND photo_id = $2 AND label = $3',
      [userId, photoId, label]
    );
  }

  async getMyLabels(userId) {
    const result = await this.pool.query(
      `SELECT DISTINCT label FROM gallery_photo_labels WHERE user_id = $1 ORDER BY label`,
      [userId]
    );
    return result.rows.map(r => r.label);
  }

  async searchPhotos(searchPattern, limit, offset, churchId) {
    if (!churchId) throw new Error('searchPhotos: churchId is required');
    // FTS replaces DISTINCT + ILIKE '%q%' fan-out — plainto_tsquery safely
    // parses arbitrary input; strip the caller's legacy % wrappers.
    const term = String(searchPattern).replace(/%/g, '').trim();
    if (!term) return [];
    const result = await this.pool.query(
      `SELECT gp.*,
              u.first_name || ' ' || u.last_name as uploaded_by_name,
              ga.title as album_title
       FROM gallery_photos gp
       LEFT JOIN users u ON gp.uploaded_by = u.id
       LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
       WHERE gp.church_id = $4
         AND (
           to_tsvector('english', COALESCE(gp.title, '') || ' ' || COALESCE(gp.description, ''))
             @@ plainto_tsquery('english', $1)
           OR EXISTS (
             SELECT 1 FROM photo_tag_assignments pta
             JOIN photo_tags pt ON pta.tag_id = pt.id
             WHERE pta.photo_id = gp.id
               AND to_tsvector('english', pt.name) @@ plainto_tsquery('english', $1)
           )
         )
       ORDER BY gp.uploaded_at DESC
       LIMIT $2 OFFSET $3`,
      [term, limit, offset, churchId]
    );
    return result.rows;
  }

  async filterPhotosByTags(tagIds, limit, offset, churchId) {
    if (!churchId) throw new Error('filterPhotosByTags: churchId is required');
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
       WHERE pta.tag_id IN (${placeholders}) AND gp.church_id = $${tagIds.length + 1}
       GROUP BY gp.id, u.first_name, u.last_name, ga.title
       ORDER BY gp.uploaded_at DESC
       LIMIT $${tagIds.length + 2} OFFSET $${tagIds.length + 3}
    `;

    const params = [...tagIds, churchId, limit, offset];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async filterPhotosByDate(startDate, endDate, limit, offset, churchId) {
    if (!churchId) throw new Error('filterPhotosByDate: churchId is required');
    let query = `
      SELECT gp.*,
             u.first_name || ' ' || u.last_name as uploaded_by_name,
             ga.title as album_title
      FROM gallery_photos gp
      LEFT JOIN users u ON gp.uploaded_by = u.id
      LEFT JOIN gallery_albums ga ON gp.album_id = ga.id
      WHERE gp.church_id = $1
    `;
    const params = [churchId];
    let paramCount = 1;

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

  async updatePhotoMetadata(photoId, camera, location, iso, aperture, shutter_speed, churchId) {
    if (!churchId) throw new Error('updatePhotoMetadata: churchId is required');
    const result = await this.pool.query(
      `UPDATE gallery_photos
       SET camera = COALESCE($1, camera),
           location = COALESCE($2, location),
           iso = COALESCE($3, iso),
           aperture = COALESCE($4, aperture),
           shutter_speed = COALESCE($5, shutter_speed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND church_id = $7
       RETURNING *`,
      [camera, location, iso, aperture, shutter_speed, photoId, churchId]
    );
    return result.rows[0];
  }

  async updatePhotoPrivacy(photoId, is_private, allowed_roles, churchId) {
    if (!churchId) throw new Error('updatePhotoPrivacy: churchId is required');
    const result = await this.pool.query(
      `UPDATE gallery_photos
       SET is_private = COALESCE($1, is_private),
           allowed_roles = COALESCE($2, allowed_roles),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND church_id = $4
       RETURNING *`,
      [is_private, allowed_roles, photoId, churchId]
    );
    return result.rows[0];
  }

  async getPhotoAnalytics(photoId, churchId) {
    if (!churchId) throw new Error('getPhotoAnalytics: churchId is required');
    // All counts scoped through the photo's own church so a foreign-church
    // photoId returns zeros instead of that church's engagement stats.
    const scope = 'AND EXISTS (SELECT 1 FROM gallery_photos WHERE id = $1 AND church_id = $2)';
    const [viewResult, downloadResult, commentResult, shareResult] = await Promise.all([
      this.pool.query(`SELECT COUNT(*) as count FROM gallery_photo_views WHERE photo_id = $1 ${scope}`, [photoId, churchId]),
      this.pool.query(`SELECT COUNT(*) as count FROM gallery_photo_downloads WHERE photo_id = $1 ${scope}`, [photoId, churchId]),
      this.pool.query(`SELECT COUNT(*) as count FROM gallery_comments WHERE photo_id = $1 ${scope}`, [photoId, churchId]),
      this.pool.query(`SELECT COUNT(*) as count FROM gallery_photo_shares WHERE photo_id = $1 ${scope}`, [photoId, churchId]),
    ]);

    return {
      views: parseInt(viewResult.rows[0].count),
      downloads: parseInt(downloadResult.rows[0].count),
      comments: parseInt(commentResult.rows[0].count),
      shares: parseInt(shareResult.rows[0].count)
    };
  }

  async recordPhotoDownload(photoId, userId, churchId) {
    if (!churchId) throw new Error('recordPhotoDownload: churchId is required');
    await this.pool.query(
      `INSERT INTO gallery_photo_downloads (photo_id, user_id, downloaded_at)
       SELECT $1, $2, CURRENT_TIMESTAMP
       WHERE EXISTS (SELECT 1 FROM gallery_photos WHERE id = $1 AND church_id = $3)`,
      [photoId, userId, churchId]
    );
  }

  async sharePhoto(photoId, userId, platform, recipient, churchId) {
    if (!churchId) throw new Error('sharePhoto: churchId is required');
    await this.pool.query(
      `INSERT INTO gallery_photo_shares (photo_id, user_id, platform, recipient, shared_at)
       SELECT $1, $2, $3, $4, CURRENT_TIMESTAMP
       WHERE EXISTS (SELECT 1 FROM gallery_photos WHERE id = $1 AND church_id = $5)`,
      [photoId, userId, platform, recipient, churchId]
    );
  }

  async getGalleryAnalytics(startDate, endDate, churchId) {
    if (!churchId) throw new Error('GalleryRepository.getGalleryAnalytics: churchId required');
    const totalResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM gallery_photos WHERE church_id = $1', [churchId]);

    const albumResult = await this.pool.query(
      `SELECT ga.title, COUNT(gp.id) as count
       FROM gallery_albums ga
       LEFT JOIN gallery_photos gp ON ga.id = gp.album_id AND gp.church_id = $1
       WHERE ga.church_id = $1
       GROUP BY ga.title`, [churchId]
    );

    let trendQuery = `
      SELECT DATE(uploaded_at) as date, COUNT(*) as count
      FROM gallery_photos
      WHERE uploaded_at IS NOT NULL AND church_id = $1
    `;
    const trendParams = [churchId];

    if (startDate) {
      trendQuery += ` AND uploaded_at >= $${trendParams.length + 1}`;
      trendParams.push(startDate);
    }
    if (endDate) {
      trendQuery += ` AND uploaded_at <= $${trendParams.length + 1}`;
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

  // Insert a photo row for a directly-uploaded file (multipart upload,
  // not Telegram-sourced). album_id may be null — the photo still shows
  // in the church gallery.
  async createUploadedPhoto({ churchId, fileUrl, caption, description, category, status, fileSize, fileType, uploadedBy }) {
    const result = await this.pool.query(
      `INSERT INTO gallery_photos
         (church_id, file_url, thumbnail_url, title, caption, description, category, status, file_size, file_type, uploaded_by)
       VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [churchId, fileUrl, caption || null, description || null, category || null, status || 'pending', fileSize || null, fileType || null, uploadedBy]
    );
    return result.rows[0];
  }

  // Batch-update shared fields across a set of photos (church-scoped)
  async batchUpdatePhotos(photoIds, { category, caption, description }, churchId) {
    const updated = [];
    const errors = [];
    for (const id of photoIds) {
      try {
        const result = await this.pool.query(
          `UPDATE gallery_photos
           SET category = COALESCE($1, category),
               caption = COALESCE($2, caption),
               title = COALESCE($2, title),
               description = COALESCE($3, description),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4 AND church_id = $5
           RETURNING *`,
          [category || null, caption || null, description || null, id, churchId]
        );
        if (result.rows[0]) updated.push(result.rows[0]);
        else errors.push({ id, error: 'Not found' });
      } catch (e) {
        errors.push({ id, error: e.message });
      }
    }
    return { updated, errors };
  }
}

module.exports = new GalleryRepository();
