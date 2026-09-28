/**
 * Sync photos from a Telegram channel into the gallery.
 * Downloads media to uploads/gallery and registers rows in gallery_photos.
 *
 * Usage (on server, from backend dir):
 *   node scripts/sync-telegram-gallery.js [channel] [churchSlug] [limit]
 * Defaults: @sdakiserianmain, kiserian-main-sda, 100
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { pool } = require('../config/database');

let CHANNEL = process.argv[2] || 'sdakiserianmain';
const CHURCH_SLUG = process.argv[3] || 'kiserian-main-sda';
const LIMIT = parseInt(process.argv[4] || '100', 10);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'gallery');

async function main() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const church = await pool.query('SELECT id, name FROM churches WHERE slug = $1', [CHURCH_SLUG]);
  if (!church.rows.length) throw new Error(`Church '${CHURCH_SLUG}' not found`);
  const churchId = church.rows[0].id;
  console.log(`Church: ${church.rows[0].name} (${churchId})`);

  if (CHANNEL === 'auto') {
    const cfg = await pool.query('SELECT channel_id, channel_username FROM telegram_channels WHERE church_id = $1 AND is_active = true', [churchId]);
    if (!cfg.rows.length) throw new Error(`No Telegram channel configured for church ${CHURCH_SLUG}`);
    CHANNEL = cfg.rows[0].channel_username || cfg.rows[0].channel_id;
    console.log(`Using configured channel: ${CHANNEL}`);
  }

  const session = fs.readFileSync(path.join(__dirname, '..', 'sessions', 'telegram.session'), 'utf8').trim();
  const client = new TelegramClient(new StringSession(session), parseInt(process.env.TELEGRAM_API_ID), process.env.TELEGRAM_API_HASH, { connectionRetries: 3 });
  await client.connect();

  const entity = await client.getEntity(CHANNEL);
  console.log(`Channel: ${entity.title} (${entity.id})`);

  // Register channel
  await pool.query(
    `INSERT INTO telegram_channels (church_id, channel_id, channel_name, channel_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [churchId, entity.id.toString(), entity.title, entity.username || CHANNEL]
  );

  // Ensure an album exists for this channel's photos
  let album = await pool.query(
    'SELECT id FROM gallery_albums WHERE church_id = $1 AND telegram_channel_id = $2',
    [churchId, entity.id.toString()]
  );
  if (!album.rows.length) {
    const creator = await pool.query('SELECT id FROM users WHERE church_id = $1 ORDER BY created_at LIMIT 1', [churchId]);
    album = await pool.query(
      `INSERT INTO gallery_albums (church_id, title, description, telegram_channel_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [churchId, `Telegram — ${entity.title}`, `Photos synced from @${entity.username || CHANNEL}`, entity.id.toString(), creator.rows[0]?.id || null]
    );
  }
  const albumId = album.rows[0].id;
  const uploadedBy = (await pool.query('SELECT id FROM users WHERE church_id = $1 ORDER BY created_at LIMIT 1', [churchId])).rows[0]?.id || null;

  const messages = await client.getMessages(entity, { limit: LIMIT });
  let synced = 0, skipped = 0, failed = 0;

  for (const msg of messages) {
    const media = msg.media;
    if (!media || !media.photo) continue;
    try {
      const fileUniqueId = media.photo.id.toString();

      const exists = await pool.query(
        'SELECT id FROM gallery_photos WHERE telegram_file_unique_id = $1',
        [fileUniqueId]
      );
      if (exists.rows.length) { skipped++; continue; }

      const filename = `tg_${entity.id}_${msg.id}.jpg`;
      const filePath = path.join(UPLOAD_DIR, filename);
      const buf = await client.downloadMedia(media, {});
      if (!buf) { failed++; continue; }
      fs.writeFileSync(filePath, buf);

      const caption = (msg.message || '').trim().slice(0, 255) || null;
      const title = caption || `Photo ${msg.id}`;
      await pool.query(
        `INSERT INTO gallery_photos
          (church_id, title, description, file_url, file_size, file_type, width, height,
           telegram_file_id, telegram_file_unique_id, telegram_channel_id, telegram_msg_id, uploaded_at, album_id, uploaded_by)
         VALUES ($1, $2::text, $3::text, $4::text, $5, 'image/jpeg', $6, $7, $8::text, $9::text, $10::text, $11, COALESCE($12::timestamptz, CURRENT_TIMESTAMP), $13, $14)`,
        [
          churchId,
          title,
          caption,
          `/uploads/gallery/${filename}`,
          buf.length,
          media.photo.w || null,
          media.photo.h || null,
          fileUniqueId,
          fileUniqueId,
          entity.id.toString(),
          msg.id,
          msg.date ? new Date(msg.date * 1000) : null,
          albumId,
          uploadedBy
        ]
      );
      synced++;
      console.log(`  synced msg ${msg.id} -> ${filename}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL msg ${msg.id}: ${e.message}`);
    }
  }

  await client.disconnect();
  await pool.query('UPDATE telegram_channels SET last_sync_at = CURRENT_TIMESTAMP WHERE channel_id = $1', [entity.id.toString()]);
  console.log(`Done: ${synced} synced, ${skipped} already present, ${failed} failed (${messages.length} messages scanned)`);
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
