const axios = require('axios');

// Credentials from Daraja app
const CONSUMER_KEY = 'zRIIzmbsF9eSivvxpnMjUIl3goKx9V0CxAG0m53KQai4lYkf';
const CONSUMER_SECRET = 'WVhz6kHVABQGHK23DWHV1r4pOSxgqIfEwQdvMUxkbuHFR0AAMedUXLxYmlr4FhCQ';
const BASE_URL = 'https://sandbox.safaricom.co.ke';

async function testOAuth() {
  try {
    console.log('Testing M-Pesa OAuth Token Generation...');
    console.log('Consumer Key:', CONSUMER_KEY.substring(0, 10) + '...');
    console.log('Consumer Secret:', CONSUMER_SECRET.substring(0, 10) + '...');

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    console.log('Base64 Auth:', auth.substring(0, 20) + '...');

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
