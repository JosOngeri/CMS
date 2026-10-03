const axios = require('axios');
require('dotenv').config();

// L765: credentials come from env — the sandbox pair that used to be
// hardcoded here was committed to git and must be rotated on Daraja.
const CONSUMER_KEY = process.env.MPESA_SANDBOX_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_SANDBOX_CONSUMER_SECRET;
const BASE_URL = 'https://sandbox.safaricom.co.ke';

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error('Set MPESA_SANDBOX_CONSUMER_KEY and MPESA_SANDBOX_CONSUMER_SECRET in .env');
  process.exit(1);
}

async function testOAuth() {
  try {
    console.log('Testing M-Pesa OAuth Token Generation...');
    // Never print secret material — not even prefixes (they end up in logs).

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    console.log('\n✅ SUCCESS! OAuth Token Generated');
    console.log('Access Token:', response.data.access_token.substring(0, 30) + '...');
    console.log('Expires In:', response.data.expires_in, 'seconds');
    console.log('\nThis means your Consumer Key and Secret are valid!');

    return response.data.access_token;
  } catch (error) {
    console.log('\n❌ FAILED! OAuth Token Generation Error');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

async function testSTKPush(accessToken) {
  if (!accessToken) {
    console.log('\n⚠️ Skipping STK Push test - No access token');
    return;
  }

  console.log('\n--- Testing STK Push ---');
  console.log('⚠️ NOTE: STK Push requires Passkey and Short Code');
  console.log('Your Daraja app shows:');
  console.log('  - Passkey: N/A (not set)');
  console.log('  - Short Code: N/A (not set)');
  console.log('  - Products: None (M-Pesa Express not enabled)');
  console.log('\nTo enable STK Push:');
  console.log('  1. Go to your Daraja app');
  console.log('  2. Add "M-Pesa Express" product');
  console.log('  3. Get the Passkey from Test Data section');
  console.log('  4. Use sandbox shortcode: 174379');
}

// Run tests
testOAuth().then(token => {
  testSTKPush(token);
});
