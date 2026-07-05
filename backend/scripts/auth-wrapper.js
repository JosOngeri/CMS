require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const path = require('path');
const fs = require('fs');

// Configuration
const ACCOUNT_TYPE = process.argv[2] || 'primary';
const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
// Allow phone override from sessions/auth_phone.txt (set by API)
const PHONE_OVERRIDE_FILE = path.join(__dirname, '../sessions/auth_phone.txt');
const PHONE_NUMBER = fs.existsSync(PHONE_OVERRIDE_FILE)
  ? fs.readFileSync(PHONE_OVERRIDE_FILE, 'utf-8').trim()
  : process.env.TELEGRAM_PHONE_NUMBER;
const TWO_FA_PASSWORD = process.env.TELEGRAM_2FA_PASSWORD || '';
const SESSION_FILE = path.join(__dirname, `../sessions/telegram_${ACCOUNT_TYPE}.session`);
const CODE_FILE = path.join(__dirname, `../sessions/pending_code_${ACCOUNT_TYPE}.txt`);
const STATUS_FILE = path.join(__dirname, `../sessions/auth_status_${ACCOUNT_TYPE}.json`);

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, '../sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

let client = null;

function updateStatus(status, message) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ 
    status, 
    message, 
    timestamp: Date.now(),
    phoneNumber: PHONE_NUMBER 
  }));
}

async function waitForCode() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (fs.existsSync(CODE_FILE)) {
        const code = fs.readFileSync(CODE_FILE, 'utf-8').trim();
        if (code) {
          clearInterval(checkInterval);
          fs.unlinkSync(CODE_FILE);
          resolve(code);
          return;
        }
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for code'));
      }
    }, 1000);
  });
}

async function authenticate() {
  try {
    console.log('Starting Telegram authentication...');
    console.log('Phone number:', PHONE_NUMBER);
    updateStatus('sending_code', 'Sending verification code...');
    
    const stringSession = new StringSession('');
    
    client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => PHONE_NUMBER,
      password: async () => {
        if (TWO_FA_PASSWORD) {
          console.log('2FA password required, using from env');
          return TWO_FA_PASSWORD;
        }
        console.log('2FA password required but not configured');
        throw new Error('2FA password not configured');
      },
      phoneCode: async () => {
        updateStatus('waiting_code', 'Waiting for verification code...');
        console.log('Waiting for code via file/API...');
        const code = await waitForCode();
        console.log('Code received:', code);
        updateStatus('verifying', 'Verifying code...');
        return code;
      },
      onError: (err) => console.error('Error:', err),
    });

    // Save session
    const sessionString = client.session.save();
    fs.writeFileSync(SESSION_FILE, sessionString);
    
    console.log('Authentication successful!');
    updateStatus('success', 'Authentication successful');
    
    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Authentication failed:', error);
    updateStatus('error', error.message);
    process.exit(1);
  }
}

// Check if already authenticated
if (fs.existsSync(SESSION_FILE)) {
  console.log('Already authenticated');
  updateStatus('already_authenticated', 'Session already exists');
  process.exit(0);
}

authenticate();
