const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../config/logging');
const { pool } = require('../config/database');
const { cachePhoto, getCachedPhoto } = require('../helpers/galleryCache');

// Configuration
const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER;
const TWO_FA_PASSWORD = process.env.TELEGRAM_2FA_PASSWORD || '';
const WRAPPER_SCRIPT = path.join(__dirname, '../scripts/auth-wrapper.js');
const SESSION_FILE = path.join(__dirname, '../sessions/telegram_primary.session');
const CODE_FILE = path.join(__dirname, '../sessions/pending_code_primary.txt');
const STATUS_FILE = path.join(__dirname, '../sessions/auth_status_primary.json');

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, '../sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

let client = null;
let isConnected = false;
let authProcess = null;

/**
 * Get auth status
 */
function getAuthStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
      return status;
    }
    return { status: 'not_started', message: 'Authentication not started' };
  } catch (error) {
    return { status: 'error', message: 'Failed to read auth status' };
  }
}

/**
 * Start authentication process using wrapper script
 */
async function startAuth(phoneOverride = null) {
  try {
    const phoneToUse = phoneOverride || PHONE_NUMBER;
    logger.info(`Starting Telegram authentication for ${phoneToUse} using wrapper script...`);

    // Persist override to a temp file for wrapper to pick up
    if (phoneOverride) {
      fs.writeFileSync(
        path.join(__dirname, '../sessions/auth_phone.txt'),
        phoneOverride
      );
    }
    
    // Check if session already exists
    if (fs.existsSync(SESSION_FILE)) {
      logger.info('Session already exists');
      return { needsAuth: false, message: 'Already authenticated' };
    }

    // Kill any existing auth process
    if (authProcess) {
      authProcess.kill();
      authProcess = null;
    }

    // Clean up stale code file
    if (fs.existsSync(CODE_FILE)) {
      fs.unlinkSync(CODE_FILE);
    }

    // Spawn wrapper script
    authProcess = spawn('node', [WRAPPER_SCRIPT, 'primary'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Log output
    authProcess.stdout.on('data', (data) => {
      logger.info(`[Auth Wrapper]: ${data.toString().trim()}`);
    });

    authProcess.stderr.on('data', (data) => {
      logger.error(`[Auth Wrapper Error]: ${data.toString().trim()}`);
    });

    authProcess.on('exit', (code) => {
      logger.info(`Auth wrapper exited with code: ${code}`);
      authProcess = null;
    });

    // Wait for wrapper to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return { needsAuth: true, message: 'Verification code sent to Telegram' };
  } catch (error) {
    logger.error('Failed to start auth:', error);
    if (authProcess) {
      authProcess.kill();
      authProcess = null;
    }
    throw error;
  }
}

/**
 * Submit verification code
 */
async function submitCode(code) {
  try {
    logger.info('Submitting verification code...');
    
    if (!authProcess) {
      // Check if session already exists
      if (fs.existsSync(SESSION_FILE)) {
        return { success: true, message: 'Already authenticated' };
      }
      throw new Error('No pending authentication. Please start authentication first.');
    }

    // Write code to file
    fs.writeFileSync(CODE_FILE, code);
    logger.info('Code written to file');

    // Wait for auth to complete (up to 30 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (fs.existsSync(SESSION_FILE)) {
        logger.info('Session file created - auth successful');
        if (authProcess) {
          authProcess.kill();
          authProcess = null;
        }
        return { success: true, message: 'Authentication successful' };
      }
      
      if (!authProcess) {
        throw new Error('Authentication process exited unexpectedly');
      }
      
      attempts++;
      logger.info(`Waiting for auth to complete... ${attempts}/${maxAttempts}`);
    }
    
    throw new Error('Authentication timed out');
  } catch (error) {
    logger.error('Failed to submit code:', error);
    if (authProcess) {
      authProcess.kill();
      authProcess = null;
    }
    throw error;
  }
}

/**
 * Initialize MTProto client
 */
async function initClient() {
  try {
    if (isConnected && client) {
      return client;
    }

    if (!fs.existsSync(SESSION_FILE)) {
      throw new Error('No session found. Please authenticate first.');
    }

    logger.info('Initializing Telegram MTProto client...');
    
    const session = fs.readFileSync(SESSION_FILE, 'utf-8');
    const stringSession = new StringSession(session);

    client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
      timeout: 30000,
    });

    await client.connect();
    isConnected = true;
    logger.info('Telegram MTProto client connected successfully');
    return client;
  } catch (error) {
    logger.error('Failed to initialize Telegram MTProto client:', error);
    isConnected = false;
    throw error;
  }
}

/**
 * Fetch list of channels/groups the user is a member of
 */
async function fetchUserChannels() {
  try {
    const tgClient = await initClient();
    logger.info('Fetching user channels...');

    const dialogs = await tgClient.getDialogs({ limit: 100 });

    const channels = [];
    for (const dialog of dialogs) {
      const entity = dialog.entity;
      // Include channels and megagroups
      if (entity.className === 'Channel' || entity.megagroup || entity.broadcast) {
        channels.push({
          id: entity.id.toString(),
          title: entity.title,
          username: entity.username ? `@${entity.username}` : null,
          type: entity.megagroup ? 'group' : 'channel',
          participantsCount: entity.participantsCount || 0,
          photo: null // We skip downloading thumbnails for speed
        });
      }
    }

    logger.info(`Found ${channels.length} channels`);
    return channels;
  } catch (error) {
    logger.error('Error fetching user channels:', error);
    throw error;
  }
}

/**
 * Fetch channel photos using MTProto
 */
async function fetchChannelPhotos(channelId, limit = 100) {
  try {
    const tgClient = await initClient();
    
    logger.info(`Fetching photos from channel: ${channelId} using MTProto`);

    // Resolve channel
    const channel = await tgClient.getInputEntity(channelId);
    logger.info(`Resolved channel: ${channel.title || channelId}`);

    // Get channel messages
    const messages = await tgClient.getMessages(channel, {
      limit: limit,
      reverse: true, // Get newest first
    });

    const photos = [];
    for (const message of messages) {
      if (message.photo) {
        const photoSize = message.photo.sizes[message.photo.sizes.length - 1];
        
        // Download photo
        const buffer = await tgClient.downloadMedia(message.photo, {
          progress: (bytes, total) => {
            // Optional: track progress
          }
        });

        // Convert to base64 for storage
        const base64 = buffer.toString('base64');
        const fileUrl = `data:image/jpeg;base64,${base64}`;

        photos.push({
          file_unique_id: message.photo.id.toString(),
          file_url: fileUrl,
          width: photoSize.w,
          height: photoSize.h,
          caption: message.message,
          date: message.date
        });
      }
    }

    logger.info(`Fetched ${photos.length} photos from Telegram using MTProto`);
    return photos;
  } catch (error) {
    logger.error('Error fetching channel photos with MTProto:', error);
    throw error;
  }
}

/**
 * Sync Telegram photos to database with default album allocation
 */
async function syncTelegramPhotos(albumId = null, channelOverride = null) {
  try {
    const channelId = channelOverride || process.env.TELEGRAM_CHANNEL_ID;
    if (!channelId) {
      throw new Error('TELEGRAM_CHANNEL_ID not configured');
    }

    // If no album specified, get or create default album
    let targetAlbumId = albumId;
    if (!targetAlbumId) {
      const defaultAlbum = await pool.query(
        `SELECT id FROM gallery_albums WHERE title = 'Telegram Photos' LIMIT 1`
      );
      
      if (defaultAlbum.rows.length === 0) {
        const newAlbum = await pool.query(
          `INSERT INTO gallery_albums (title, description, created_by) 
           VALUES ($1, $2, $3) RETURNING id`,
          ['Telegram Photos', 'Auto-synced from Telegram channel', 1]
        );
        targetAlbumId = newAlbum.rows[0].id;
        logger.info(`Created default album with ID: ${targetAlbumId}`);
      } else {
        targetAlbumId = defaultAlbum.rows[0].id;
        logger.info(`Using existing default album with ID: ${targetAlbumId}`);
      }
    }

    const photos = await fetchChannelPhotos(channelId, 100);
    let synced = 0;
    let skipped = 0;

    for (const photo of photos) {
      // Check if photo already exists
      const existing = await pool.query(
        'SELECT id FROM gallery_photos WHERE telegram_file_unique_id = $1',
        [photo.file_unique_id]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Insert new photo
      await pool.query(
        `INSERT INTO gallery_photos
        (album_id, title, description, file_url, telegram_file_unique_id, width, height, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          targetAlbumId,
          'Telegram Photo',
          photo.caption || '',
          photo.file_url,
          photo.file_unique_id,
          photo.width,
          photo.height,
          1
        ]
      );

      synced++;
    }

    logger.info(`Synced ${synced} photos to album ${targetAlbumId}, skipped ${skipped} existing photos`);
    return { synced, skipped, total: photos.length, albumId: targetAlbumId };
  } catch (error) {
    logger.error('Error syncing Telegram photos with MTProto:', error);
    throw error;
  }
}

/**
 * Check MTProto connection status
 */
async function checkMTProtoConnection() {
  try {
    const authStatus = getAuthStatus();
    
    if (authStatus.status === 'success' || authStatus.status === 'already_authenticated') {
      if (isConnected && client) {
        const me = await client.getMe();
        return {
          connected: true,
          type: 'MTProto',
          userId: me.id,
          username: me.username,
          phone: PHONE_NUMBER,
          authStatus
        };
      }
      
      // Try to connect
      await initClient();
      const me = await client.getMe();
      return {
        connected: true,
        type: 'MTProto',
        userId: me.id,
        username: me.username,
        phone: PHONE_NUMBER,
        authStatus
      };
    }
    
    return {
      connected: false,
      type: 'MTProto',
      authStatus
    };
  } catch (error) {
    logger.error('MTProto connection check failed:', error);
    return {
      connected: false,
      type: 'MTProto',
      error: error.message,
      authStatus: getAuthStatus()
    };
  }
}

/**
 * Disconnect MTProto client
 */
async function disconnectClient() {
  if (client) {
    await client.disconnect();
    isConnected = false;
    logger.info('Telegram MTProto client disconnected');
  }
}

module.exports = {
  startAuth,
  submitCode,
  initClient,
  fetchChannelPhotos,
  fetchUserChannels,
  syncTelegramPhotos,
  checkMTProtoConnection,
  disconnectClient,
  getAuthStatus
};
