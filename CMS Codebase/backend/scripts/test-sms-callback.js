require('dotenv').config();
const axios = require('axios');

async function testSMSCallback() {
  try {
    console.log('Testing SMS Delivery Callback...');
    
    // Simulate a delivery callback from Blessed Texts
    const callbackData = {
      message_id: '6a205ba7f3c17633135538', // Use the message ID from our latest test
      phone: '+254724363290',
      status: '1000', // Success status code
      error_code: null,
      error_message: null,
      timestamp: new Date().toISOString()
    };

    console.log('Sending callback data:', callbackData);
    
    const callbackUrl = process.env.SMS_CALLBACK_URL || 'http://localhost:5005/api/sms/delivery-callback';
    
    const response = await axios.post(callbackUrl, callbackData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Callback Response:', response.data);
    
    if (response.data.success) {
      console.log('✅ SMS Delivery Callback test successful!');
    } else {
      console.log('❌ SMS Delivery Callback test failed:', response.data.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('SMS Callback test error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testSMSCallback();
