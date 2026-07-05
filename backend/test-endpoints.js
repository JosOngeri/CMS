const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testAuthEndpoints() {
  console.log('Testing AUTH endpoints...');

  try {
    // Test login with existing user
    console.log('\n1. Testing login with existing user...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    console.log('✅ Login successful:', loginResponse.data);
    return loginResponse.data.data.accessToken;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);

    // If login fails, try registration
    try {
      console.log('\n2. Testing registration...');
      const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('✅ Registration successful:', registerResponse.data);

      // Then login
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!'
      });
      console.log('✅ Login successful:', loginResponse.data);
      return loginResponse.data.data.accessToken;
    } catch (regError) {
      console.log('❌ Registration also failed:', regError.response?.data || regError.message);
      return null;
    }
  }
}

async function testTelegramEndpoints(token) {
  console.log('\nTesting TELEGRAM endpoints...');

  try {
    // Test get channels
    console.log('\n3. Testing get channels...');
    const channelsResponse = await axios.get(`${API_URL}/api/telegram/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get channels successful:', channelsResponse.data);
  } catch (error) {
    console.log('❌ Get channels failed:', error.response?.data || error.message);
  }

  try {
    // Test get settings
    console.log('\n4. Testing get settings...');
    const settingsResponse = await axios.get(`${API_URL}/api/telegram/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get settings successful:', settingsResponse.data);
  } catch (error) {
    console.log('❌ Get settings failed:', error.response?.data || error.message);
  }

  try {
    // Test cache health
    console.log('\n5. Testing cache health...');
    const healthResponse = await axios.get(`${API_URL}/api/telegram/cache/health`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Cache health successful:', healthResponse.data);
  } catch (error) {
    console.log('❌ Cache health failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  try {
    const token = await testAuthEndpoints();
    if (token) {
      await testTelegramEndpoints(token);
    }
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
  }
}

runTests();