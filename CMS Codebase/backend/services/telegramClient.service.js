const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const bigInt = require('big-integer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('telegramClient.service');

// Configuration
const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const WRAPPER_SCRIPT = path.join(__dirname, '../scripts/auth-wrapper.js');

// Track auth processes for each account
const authProcesses = {
  primary: null,
  fallback: null
};

function getConfig(accountType = 'primary') {
  const phoneNumber = accountType === 'fallback' 
    ? process.env.TELEGRAM_FALLBACK_PHONE_NUMBER 
    : process.env.TELEGRAM_PHONE_NUMBER;
  const SESSION_FILE = path.join(__dirname, `../sessions/telegram_${accountType}.session`);
  const CODE_FILE = path.join(__dirname, `../sessions/pending_code_${accountType}.txt`);
  const STATUS_FILE = path.join(__dirname, `../sessions/auth_status_${accountType}.json`);
  return { phoneNumber, SESSION_FILE, CODE_FILE, STATUS_FILE };
}

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, '../sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

let client = null;
let isConnected = false;

/**
 * Start authentication process
 * Spawns wrapper script that handles the Telegram auth flow
 */
async function startAuth(accountType = 'primary') {
  try {
    logger.info('startAuth', `startAuth called for ${accountType} - spawning wrapper script`);
    
    const { SESSION_FILE, CODE_FILE } = getConfig(accountType);
    
    // Check if session already exists
    if (fs.existsSync(SESSION_FILE)) {
      logger.info('startAuth', `Session already exists for ${accountType}`);
      return { needsAuth: false, message: 'Already authenticated' };
    }

    // Kill any existing auth process for this account
    if (authProcesses[accountType]) {
      authProcesses[accountType].kill();
      authProcesses[accountType] = null;
    }

    // Clean up any stale code file
    if (fs.existsSync(CODE_FILE)) {
      fs.unlinkSync(CODE_FILE);
    }

    // Spawn the wrapper script with account type argument
    logger.info('startAuth', 'Spawning wrapper script:', WRAPPER_SCRIPT, accountType);
    authProcesses[accountType] = spawn('node', [WRAPPER_SCRIPT, accountType], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Log output from wrapper
    authProcesses[accountType].stdout.on('data', (data) => {
      logger.info('startAuth', `[Auth Wrapper ${accountType}]:`, data.toString().trim());
    });

    authProcesses[accountType].stderr.on('data', (data) => {
      logger.error('startAuth', `[Auth Wrapper Error ${accountType}]:`, data.toString().trim());
    });

    authProcesses[accountType].on('exit', (code) => {
      logger.info('startAuth', `Auth wrapper for ${accountType} exited with code:`, code);
      authProcesses[accountType] = null;
    });

    // Wait for wrapper to initialize and send code
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return { needsAuth: true, message: 'Verification code sent to Telegram' };
  } catch (error) {
    logger.error('startAuth', `Failed to start auth for ${accountType}:`, error);
    if (authProcesses[accountType]) {
      authProcesses[accountType].kill();
      authProcesses[accountType] = null;
    }
    throw error;
  }
}

/**
 * Submit verification code
 * Writes code to file for wrapper script to read
 */
async function submitCode(code, accountType = 'primary') {
  try {
    logger.info('submitCode', `submitCode called for ${accountType} with:`, code);
    
    const { SESSION_FILE, CODE_FILE } = getConfig(accountType);
    
    // Check if auth process is running
    if (!authProcesses[accountType]) {
      // Check if wrapper already exited successfully (session created)
      if (fs.existsSync(SESSION_FILE)) {
        return { success: true, message: 'Already authenticated' };
      }
      throw new Error('No pending authentication. Please click "Send Verification Code" first.');
    }

    // Write code to file for wrapper to read
    fs.writeFileSync(CODE_FILE, code);
    logger.info('submitCode', `Code written to file for ${accountType}:`, CODE_FILE);

    // Wait for auth to complete (up to 30 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if session file was created
      if (fs.existsSync(SESSION_FILE)) {
        logger.info('submitCode', `Session file created for ${accountType} - auth successful`);
        if (authProcesses[accountType]) {
          authProcesses[accountType].kill();
          authProcesses[accountType] = null;
        }
        return { success: true, message: 'Authentication successful' };
      }
      
      // Check if auth process exited with error
      if (!authProcesses[accountType]) {
        throw new Error('Authentication process exited unexpectedly. Please try again.');
      }
      
      attempts++;
      logger.info('submitCode', `Waiting for auth to complete for ${accountType}... ${attempts}/${maxAttempts}`);
    }
    
    throw new Error('Authentication timed out. Please try again.');
  } catch (error) {
    logger.error('submitCode', `Failed to submit code for ${accountType}:`, error);
    if (authProcesses[accountType]) {
      authProcesses[accountType].kill();
      authProcesses[accountType] = null;
    }
    throw error;
  }
}

/**
 * Initialize Telegram client
 */
async function initClient(accountType = 'primary') {
  if (client && isConnected) {
    return client;
  }

  try {
    const { SESSION_FILE } = getConfig(accountType);
    
    // Check if session file exists
    let session;
    if (fs.existsSync(SESSION_FILE)) {
      session = fs.readFileSync(SESSION_FILE, 'utf-8');
    } else {
      throw new Error('No session found. Please authenticate first.');
    }

    const stringSession = new StringSession(session);

    client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
      timeout: 30000,
    });

    await client.connect();
    isConnected = true;
    logger.info('initClient', 'Telegram client connected successfully');
    return client;
  } catch (error) {
    logger.error('initClient', 'Failed to initialize Telegram client:', error);
    throw error;
  }
}

/**
 * Get channel by username or ID
 */
async function getChannel(channelId) {
  try {
    const tgClient = await initClient();
    
    // Convert @username to numeric ID if needed
    if (typeof channelId === 'string' && channelId.startsWith('@')) {
      const entity = await tgClient.getEntity(channelId);
      return entity;
    }
    
    return await tgClient.getEntity(channelId);
  } catch (error) {
    logger.error('getChannel', 'Failed to get channel:', error);
    throw error;
  }
}

/**
 * Fetch all messages from a channel
 */
async function getChannelMessages(channelId, limit = 100) {
  try {
    const tgClient = await initClient();
    const channel = await getChannel(channelId);
    
    const messages = [];
    let offsetId = 0;
    let hasMore = true;
    
    while (hasMore && messages.length < limit) {
      const result = await tgClient.getMessages(channel, {
        limit: 100,
        offsetId: offsetId,
        reverse: true, // Get oldest first
      });
      
      if (result.length === 0) {
        hasMore = false;
      } else {
        messages.push(...result);
        offsetId = result[result.length - 1].id;
        hasMore = result.length === 100;
      }
    }
    
    return messages;
  } catch (error) {
    logger.error('getChannelMessages', 'Failed to fetch channel messages:', error);
    throw error;
  }
}

/**
 * Filter messages that contain photos
 */
function filterPhotoMessages(messages) {
  return messages.filter(msg => {
    // Check for photo in various possible locations
    const hasPhoto = msg.photo || msg.media?.photo || msg.message?.media?.photo;
    if (hasPhoto) {
      logger.info('filterPhotoMessages', 'Found photo in message:', msg.id, hasPhoto);
    }
    return hasPhoto;
  });
}

/**
 * Download file from Telegram using MTProto
 */
async function downloadFile(fileLocation) {
  try {
    const tgClient = await initClient();
    logger.info('downloadFile', 'Downloading file with location id:', fileLocation.id);
    
    // Convert string id/accessHash back to BigInt for the API
    const location = new Api.InputPhotoFileLocation({
      id: bigInt(fileLocation.id.toString()),
      accessHash: bigInt(fileLocation.accessHash.toString()),
      fileReference: fileLocation.fileReference,
      thumbSize: fileLocation.thumbSize || '',
    });
    
    const buffer = await tgClient.downloadFile(location, {
      dcId: fileLocation.dcId,
    });
    
    return Buffer.from(buffer);
  } catch (error) {
    logger.error('downloadFile', 'Failed to download file:', error);
    throw error;
  }
}

/**
 * Disconnect client
 */
async function disconnect() {
  if (client && isConnected) {
    await client.disconnect();
    isConnected = false;
    logger.info('disconnect', 'Telegram client disconnected');
  }
}

/**
 * Delete message from Telegram channel using MTProto
 */
async function deleteMessage(channelId, messageId) {
  try {
    const tgClient = await initClient();
    logger.info('deleteMessage', `Deleting message ${messageId} from channel ${channelId}`);
    
    const channel = await getChannel(channelId);
    logger.info('deleteMessage', 'Channel obtained:', channel);
    
    const result = await tgClient.invoke(
      new tgClient.api.channels.DeleteMessages({
        channel: channel,
        id: [messageId],
      })
    );
    
    logger.info('deleteMessage', 'Message deleted successfully, result:', result);
  } catch (error) {
    logger.error('deleteMessage', 'Failed to delete message:', error.message);
    logger.error('deleteMessage', 'Error details:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

module.exports = {
  initClient,
  startAuth,
  submitCode,
  getChannel,
  getChannelMessages,
  filterPhotoMessages,
  downloadFile,
  disconnect,
  deleteMessage,
};
