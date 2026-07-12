const BaseRepository = require('./BaseRepository');

class GalleryAlbumsRepository extends BaseRepository {
  constructor() {
    super('gallery_albums');
  }

  async getAllWithDetails(filters = {}, churchId = null) {
    let query = `
      SELECT ga.*,
             gc.name as category_name,
             gc.color as category_color,
             u.first_name || ' ' || u.last_name as created_by_name,
             (SELECT COUNT(*) FROM album_photos WHERE album_id = ga.id) as photo_count,
             (SELECT COUNT(*) FROM gallery_albums WHERE parent_id = ga.id) as sub_album_count
      FROM gallery_albums ga
      LEFT JOIN gallery_categories gc ON ga.category_id = gc.id
      LEFT JOIN users u ON ga.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND ga.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (filters.category_id) {
      paramCount++;
      query += ` AND ga.category_id = $${paramCount}`;
      params.push(filters.category_id);
    }

    if (filters.is_public !== undefined) {
      paramCount++;
      query += ` AND ga.is_public = $${paramCount}`;
      params.push(filters.is_public === 'true');
    }

    query += ` ORDER BY ga.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAlbumWithPhotos(albumId, churchId = null) {
    let query = `
      SELECT ga.*,
             gc.name as category_name,
             gc.color as category_color,
             u.first_name || ' ' || u.last_name as created_by_name,
             parent.title as parent_title
      FROM gallery_albums ga
      LEFT JOIN gallery_categories gc ON ga.category_id = gc.id
      LEFT JOIN users u ON ga.created_by = u.id
      LEFT JOIN gallery_albums parent ON ga.parent_id = parent.id
      WHERE ga.id = $1
    `;
    const params = [albumId];

    if (churchId) {
      query += ` AND ga.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const album = result.rows[0];

    // Get photos in album
    const photosResult = await this.pool.query(
      `SELECT gp.*, ap.sort_order
       FROM gallery_photos gp
       JOIN album_photos ap ON gp.id = ap.photo_id
       WHERE ap.album_id = $1
       ORDER BY ap.sort_order ASC, gp.uploaded_at DESC`,
      [albumId]
    );

    // Get sub-albums
    const subAlbumsResult = await this.pool.query(
      `SELECT ga.*,
              (SELECT COUNT(*) FROM album_photos WHERE album_id = ga.id) as photo_count
       FROM gallery_albums ga
       WHERE ga.parent_id = $1
       ORDER BY ga.created_at DESC`,
      [albumId]
    );

    return {
      ...album,
      photos: photosResult.rows,
      sub_albums: subAlbumsResult.rows
    };
  }

  async getAlbumStats(albumId, churchId = null) {
    let query = `
      SELECT
        (SELECT COUNT(*) FROM album_photos WHERE album_id = $1) as photo_count,
        (SELECT COUNT(*) FROM gallery_albums WHERE parent_id = $1) as sub_album_count,
        (SELECT SUM(file_size) FROM album_photos ap
         LEFT JOIN photos p ON ap.photo_id = p.id
         WHERE ap.album_id = $1) as total_size
    `;
    const params = [albumId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createAlbum(albumData) {
    const { title, description, category_id, parent_id, is_public, created_by } = albumData;
    const query = `
      INSERT INTO gallery_albums (title, description, category_id, parent_id, is_public, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      title,
      description,
      category_id,
      parent_id || null,
      is_public !== undefined ? is_public : true,
      created_by
    ]);
    return result.rows[0];
  }

  async updateAlbum(id, albumData) {
    const { title, description, category_id, parent_id, cover_photo_id, is_public } = albumData;
    const query = `
      UPDATE gallery_albums
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category_id = COALESCE($3, category_id),
          parent_id = COALESCE($4, parent_id),
          cover_photo_id = COALESCE($5, cover_photo_id),
          is_public = COALESCE($6, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      title,
      description,
      category_id,
      parent_id,
      cover_photo_id,
      is_public,
      id
    ]);
    return result.rows[0];
  }

  async countSubAlbums(parentId) {
    const query = 'SELECT COUNT(*) as count FROM gallery_albums WHERE parent_id = $1';
    const result = await this.pool.query(query, [parentId]);
    return parseInt(result.rows[0].count);
  }

  async addPhotoToAlbum(albumId, photoId) {
    const query = `
      INSERT INTO album_photos (album_id, photo_id, sort_order)
      VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM album_photos WHERE album_id = $1))
      ON CONFLICT (album_id, photo_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [albumId, photoId]);
    return result.rows[0];
  }

  async removePhotoFromAlbum(albumId, photoId) {
    const query = 'DELETE FROM album_photos WHERE album_id = $1 AND photo_id = $2';
    await this.pool.query(query, [albumId, photoId]);
  }

  async updatePhotoOrder(albumId, photoId, sortOrder) {
    const query = 'UPDATE album_photos SET sort_order = $1 WHERE album_id = $2 AND photo_id = $3';
    await this.pool.query(query, [sortOrder, albumId, photoId]);
  }

  async setCoverPhoto(albumId, photoId) {
    const query = 'UPDATE gallery_albums SET cover_photo_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await this.pool.query(query, [photoId, albumId]);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM gallery_albums WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new GalleryAlbumsRepository();
