const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'kmaincms', 
  user: 'postgres', 
  password: 'postgres' 
});

async function addSampleData() {
  try {
    console.log('Adding sample gallery data...');
    
    // Get a user ID
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }
    const userId = userRes.rows[0].id;
    console.log('User ID:', userId);
    
    // First, let's check if we have a church
    const churchRes = await pool.query('SELECT id FROM churches LIMIT 1');
    let churchId;
    
    if (churchRes.rows.length === 0) {
      console.log('No church found, creating one...');
      const newChurch = await pool.query(
        "INSERT INTO churches (name, slug, address, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        ['Kiserian Main SDA Church', 'kiserian-main-sda', 'Kiserian, Kenya', '+254736075771', 'info@kiseriansda.org']
      );
      churchId = newChurch.rows[0].id;
    } else {
      churchId = churchRes.rows[0].id;
    }
    
    console.log('Church ID:', churchId);

    // Create a sample album
    const albumRes = await pool.query(
      "INSERT INTO gallery_albums (title, description, church_id, church_slug, is_private, created_by) VALUES ($1, $2, $3, $4, false, $5) RETURNING id",
      ['Church Events', 'Photos from our church events and activities', churchId, 'kiserian-main-sda', userId]
    );
    const albumId = albumRes.rows[0].id;
    console.log('Created album ID:', albumId);

    // Add some sample photos with placeholder URLs
    const samplePhotos = [
      { title: 'Sabbath Service', url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800' },
      { title: 'Youth Fellowship', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800' },
      { title: 'Community Outreach', url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800' },
      { title: 'Prayer Meeting', url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800' },
      { title: 'Choir Performance', url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800' }
    ];

    for (const photo of samplePhotos) {
      await pool.query(
        "INSERT INTO gallery_photos (album_id, church_id, title, file_url, thumbnail_url, file_size, file_type, width, height, uploaded_by) VALUES ($1, $2, $3, $4, $4, 500000, 'image/jpeg', 800, 600, $5)",
        [albumId, churchId, photo.title, photo.url, userId]
      );
    }
    console.log('Added 5 sample photos');

    console.log('Sample data added successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addSampleData();
