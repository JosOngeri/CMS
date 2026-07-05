const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'kmaincms', 
  user: 'postgres', 
  password: 'postgres' 
});

async function addTelegramChannel() {
  try {
    console.log('Adding Telegram channel...');
    
    // Add the SDA Kiserian channel
    const result = await pool.query(
      `INSERT INTO telegram_channels (channel_id, channel_name, channel_username, is_active, auto_sync_to_announcements, sync_interval_hours)
       VALUES ($1, $2, $3, true, true, 1)
       ON CONFLICT (channel_id) DO UPDATE SET 
         channel_name = $2, 
         channel_username = $3,
         is_active = true,
         auto_sync_to_announcements = true
       RETURNING id`,
      ['sdakiserianmain', 'SDA Kiserian Main', '@sdakiserianmain']
    );
    
    console.log('Telegram channel added/updated:', result.rows[0]);
    console.log('Channel ID: sdakiserianmain');
    console.log('Channel Name: SDA Kiserian Main');
    console.log('Username: @sdakiserianmain');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTelegramChannel();
