require('dotenv').config();
const MpesaService = require('./utils/mpesa');

// Test credentials from database
console.log('=== M-Pesa STK Push Configuration Test ===\n');

const mpesa = new MpesaService();

// Test configuration loading from database
async function testConfig() {
  try {
    console.log('Loading configuration from database...');
    const config = await mpesa.getConfig();

    console.log('Configuration:');
    console.log('Environment:', config.environment);
    console.log('Consumer Key:', config.consumerKey ? config.consumerKey.substring(0, 10) + '...' : 'NOT SET');
    console.log('Consumer Secret:', config.consumerSecret ? config.consumerSecret.substring(0, 10) + '...' : 'NOT SET');
    console.log('Passkey:', config.passkey ? config.passkey.substring(0, 10) + '...' : 'NOT SET');
    console.log('Shortcode:', config.shortcode || 'NOT SET');
    console.log('Callback URL:', config.callbackUrl || 'NOT SET');
    console.log('Base URL:', config.baseUrl);
    console.log('Min Amount:', config.minAmount);
    console.log('Max Amount:', config.maxAmount);
    console.log('');

    // Validate configuration
    const errors = [];
    if (!config.consumerKey) errors.push('Consumer Key not set');
    if (!config.consumerSecret) errors.push('Consumer Secret not set');
    if (!config.passkey) errors.push('Passkey not set');
    if (!config.shortcode) errors.push('Shortcode not set');
    if (!config.callbackUrl) errors.push('Callback URL not set');

    if (errors.length > 0) {
      console.log('❌ Configuration Errors:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    }

    console.log('✅ Configuration looks good!\n');
    return config;
  } catch (error) {
    console.log('❌ Configuration Loading Failed:', error.message);
    console.log('Make sure the database is running and settings are loaded.');
    process.exit(1);
  }
}

// Test OAuth token generation
async function testOAuth() {
  try {
    console.log('Testing OAuth Token Generation...');
    const token = await mpesa.getAccessToken();
    console.log('✅ OAuth Token Generated:', token.substring(0, 30) + '...');
    return token;
  } catch (error) {
    console.log('❌ OAuth Token Generation Failed:', error.message);
    process.exit(1);
  }
}

// Test password generation
async function testPasswordGeneration() {
  try {
    console.log('\nTesting Password Generation...');
    const password = await mpesa.generatePassword();
    console.log('Generated Password:', password.substring(0, 30) + '...');
    console.log('Password Length:', password.length);
    console.log('✅ Password generation working');
    return password;
  } catch (error) {
    console.log('❌ Password Generation Failed:', error.message);
    process.exit(1);
  }
}

// Test STK Push
async function testSTKPush() {
  try {
    console.log('\n=== Testing STK Push ===');
    console.log('Note: This will send a real STK Push to your phone');
    console.log('Phone: 254724363290 (from your Daraja app)');
    console.log('Amount: KES 1');
    console.log('');

    const result = await mpesa.initiateSTKPush(
      '254724363290',
      1,
      'TEST-001',
      'Church Payment Test'
    );

    if (result.success) {
      console.log('✅ STK Push Initiated Successfully!');
      console.log('Checkout Request ID:', result.checkoutRequestID);
      console.log('Merchant Request ID:', result.data.MerchantRequestID);
      console.log('Customer Message:', result.data.CustomerMessage);
      console.log('\nCheck your phone for the M-Pesa prompt!');
    } else {
      console.log('❌ STK Push Failed:', result.error);
    }
  } catch (error) {
    console.log('❌ STK Push Error:', error.message);
  }
}

// Run tests
async function runTests() {
  await testConfig();
  await testOAuth();
  await testPasswordGeneration();

  console.log('\n' + '='.repeat(50));
  console.log('Do you want to test STK Push?');
  console.log('This will send a KES 1 payment prompt to 254724363290');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  console.log('='.repeat(50));

  await new Promise(resolve => setTimeout(resolve, 5000));
  await testSTKPush();
}

runTests();
