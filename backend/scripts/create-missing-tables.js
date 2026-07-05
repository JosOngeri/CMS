const { pool } = require('../config/database');

async function createMissingTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Department categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS department_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Gallery photos
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id UUID REFERENCES gallery_albums(id) ON DELETE CASCADE,
        church_id UUID,
        title VARCHAR(255),
        description TEXT,
        file_url TEXT,
        thumbnail_url TEXT,
        file_size BIGINT,
        file_type VARCHAR(50),
        width INTEGER,
        height INTEGER,
        telegram_file_id VARCHAR(255),
        telegram_file_unique_id VARCHAR(255),
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        order_index INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false
      )
    `);

    // Gallery tags
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        church_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Gallery photo-tag join
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_photo_tags (
        photo_id UUID REFERENCES gallery_photos(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES gallery_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (photo_id, tag_id)
      )
    `);

    // Gallery comments
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_id UUID REFERENCES gallery_photos(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alternative tag table names used in some queries
    await client.query(`
      CREATE TABLE IF NOT EXISTS photo_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS photo_tag_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_id UUID,
        tag_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255),
        file_path TEXT,
        file_url TEXT,
        file_content TEXT,
        size BIGINT,
        file_size BIGINT,
        storage_provider VARCHAR(100),
        storage_key TEXT,
        cloud_storage BOOLEAN DEFAULT false,
        category VARCHAR(100),
        tags TEXT,
        description TEXT,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        church_id UUID,
        search_vector TSVECTOR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(document_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        file_content TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Content
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        content TEXT,
        content_type VARCHAR(100),
        category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'draft',
        published_at TIMESTAMP,
        expires_at TIMESTAMP,
        priority VARCHAR(50),
        seo_title VARCHAR(255),
        seo_description TEXT,
        og_image TEXT,
        church_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_item_tags (
        content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES content_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (content_item_id, tag_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
        revision_number INTEGER NOT NULL,
        content TEXT,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
        meta_key VARCHAR(255) NOT NULL,
        meta_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Approvals
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
        approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payload JSONB,
        church_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(255) NOT NULL,
        details JSONB,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Missing tables created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createMissingTables();
