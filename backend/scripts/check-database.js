const { pool } = require('../config/database');

async function checkDatabase() {
  try {
    console.log('Checking database contents...\n');

    // Check users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Users: ${usersResult.rows[0].count}`);

    // Check roles
    const rolesResult = await pool.query('SELECT COUNT(*) as count FROM roles');
    console.log(`Roles: ${rolesResult.rows[0].count}`);

    // Check departments
    const departmentsResult = await pool.query('SELECT COUNT(*) as count FROM departments');
    console.log(`Departments: ${departmentsResult.rows[0].count}`);

    // Check gallery albums
    const albumsResult = await pool.query('SELECT COUNT(*) as count FROM gallery_albums');
    console.log(`Gallery Albums: ${albumsResult.rows[0].count}`);

    // Check gallery photos
    const photosResult = await pool.query('SELECT COUNT(*) as count FROM gallery_photos');
    console.log(`Gallery Photos: ${photosResult.rows[0].count}`);

    // Check announcements
    const announcementsResult = await pool.query('SELECT COUNT(*) as count FROM announcements');
    console.log(`Announcements: ${announcementsResult.rows[0].count}`);

    // Check documents
    const documentsResult = await pool.query('SELECT COUNT(*) as count FROM documents');
    console.log(`Documents: ${documentsResult.rows[0].count}`);

    console.log('\nDatabase check complete.');
  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
