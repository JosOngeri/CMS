require('dotenv').config();
const { getChannelMessages, filterPhotoMessages } = require('../services/telegramClient.service');

async function testSync() {
  try {
    console.log('Testing Telegram sync...');
    console.log('Channel ID:', process.env.TELEGRAM_CHANNEL_ID);
    console.log('API ID:', process.env.TELEGRAM_API_ID);
    console.log('API Hash:', process.env.TELEGRAM_API_HASH ? 'configured' : 'missing');
    console.log('Phone:', process.env.TELEGRAM_PHONE_NUMBER);
    
    const messages = await getChannelMessages(process.env.TELEGRAM_CHANNEL_ID, 10);
    console.log(`Fetched ${messages.length} messages from channel`);
    
    if (messages.length > 0) {
      console.log('First message keys:', Object.keys(messages[0]));
      console.log('First message:', JSON.stringify(messages[0], null, 2).substring(0, 500));
    }
    
    const photoMessages = filterPhotoMessages(messages);
    console.log(`Found ${photoMessages.length} photo messages`);
    
    if (photoMessages.length > 0) {
      console.log('First photo message:', JSON.stringify(photoMessages[0], null, 2).substring(0, 500));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Test sync error:', error);
    process.exit(1);
  }
}

testSync();
