require('dotenv').config();
const smsController = require('../controllers/sms.controller');

async function testSMS() {
  try {
    console.log('Testing SMS to +254724363290 and +254736075771...');
    
    // Simulate the request object
    const req = {
      body: {
        message: 'This is a test announcement from Kiserian Main SDA Church Website.',
        recipients: ['+254724363290', '+254736075771'],
        recipientType: 'custom'
      },
      user: {
        id: 1 // Test user ID
      }
    };

    // Simulate the response object
    const res = {
      json: (data) => {
        console.log('SMS Response:', JSON.stringify(data, null, 2));
        process.exit(0);
      },
      status: (code) => {
        console.error('SMS failed with status:', code);
        return {
          json: (data) => {
            console.error('Error:', JSON.stringify(data, null, 2));
            process.exit(1);
          }
        };
      }
    };

    await smsController.sendSMS(req, res);
  } catch (error) {
    console.error('Test SMS error:', error);
    process.exit(1);
  }
}

testSMS();
