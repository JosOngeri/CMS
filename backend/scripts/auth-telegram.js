require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const path = require('path');
const fs = require('fs');

// Configuration
const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER;
const SESSION_FILE = path.join(__dirname, '../sessions/telegram.session');

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, '../sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

async function authenticate() {
  console.log('Starting Telegram authentication...');
  console.log('Phone number:', PHONE_NUMBER);
  
  const stringSession = new StringSession('');
  
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => PHONE_NUMBER,
    password: async () => {
      // Prompt for 2FA password if needed
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise(resolve => {
        rl.question('Enter 2FA password (if enabled): ', answer => {
          rl.close();
          resolve(answer);
        });
      });
    },
    phoneCode: async () => {
      // Prompt for verification code
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise(resolve => {
        rl.question('Enter verification code sent to Telegram: ', answer => {
          rl.close();
          resolve(answer);
        });
      });
    },
    onError: (err) => console.error('Error:', err),
  });

  // Save session
  const sessionString = client.session.save();
  fs.writeFileSync(SESSION_FILE, sessionString);
  
  console.log('Authentication successful! Session saved to:', SESSION_FILE);
  await client.disconnect();
}

authenticate().catch(console.error);
