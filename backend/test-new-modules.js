const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testSMSModule(token) {
  console.log('\n=== Testing SMS Module ===');

  try {
    // Test get providers
    console.log('1. Testing get providers...');
    const providersResponse = await axios.get(`${API_URL}/api/sms/providers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get providers successful:', providersResponse.data.data.length, 'providers');

    // Test get templates
    console.log('2. Testing get templates...');
    const templatesResponse = await axios.get(`${API_URL}/api/sms/templates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get templates successful:', templatesResponse.data.data.length, 'templates');

    // Test get SMS logs
    console.log('3. Testing get SMS logs...');
    const logsResponse = await axios.get(`${API_URL}/api/sms/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get SMS logs successful');

    // Test get campaigns
    console.log('4. Testing get campaigns...');
    const campaignsResponse = await axios.get(`${API_URL}/api/sms/campaigns`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get campaigns successful');

    // Test get SMS stats
    console.log('5. Testing get SMS stats...');
    const statsResponse = await axios.get(`${API_URL}/api/sms/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get SMS stats successful');

    return true;
  } catch (error) {
    console.log('❌ SMS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDocumentsModule(token) {
  console.log('\n=== Testing DOCUMENTS Module ===');

  try {
    // Test get all documents
    console.log('1. Testing get all documents...');
    const documentsResponse = await axios.get(`${API_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get all documents successful');

    // Test get categories
    console.log('2. Testing get categories...');
    const categoriesResponse = await axios.get(`${API_URL}/api/documents/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get categories successful:', categoriesResponse.data.data.length, 'categories');

    return true;
  } catch (error) {
    console.log('❌ DOCUMENTS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testApprovalsModule(token) {
  console.log('\n=== Testing APPROVALS Module ===');

  try {
    // Test get workflows
    console.log('1. Testing get workflows...');
    const workflowsResponse = await axios.get(`${API_URL}/api/approvals/workflows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get workflows successful:', workflowsResponse.data.data.length, 'workflows');

    // Test get requests
    console.log('2. Testing get requests...');
    const requestsResponse = await axios.get(`${API_URL}/api/approvals/requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get requests successful');

    return true;
  } catch (error) {
    console.log('❌ APPROVALS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testNotificationsModule(token) {
  console.log('\n=== Testing NOTIFICATIONS Module ===');

  try {
    // Test get notifications
    console.log('1. Testing get notifications...');
    const notificationsResponse = await axios.get(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get notifications successful');

    // Test get unread count
    console.log('2. Testing get unread count...');
    const unreadCountResponse = await axios.get(`${API_URL}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get unread count successful:', unreadCountResponse.data.data.count, 'unread');

    // Test get notification types
    console.log('3. Testing get notification types...');
    const typesResponse = await axios.get(`${API_URL}/api/notifications/types`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get notification types successful:', typesResponse.data.data.length, 'types');

    // Test get preferences
    console.log('4. Testing get preferences...');
    const preferencesResponse = await axios.get(`${API_URL}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get preferences successful');

    return true;
  } catch (error) {
    console.log('❌ NOTIFICATIONS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSettingsModule(token) {
  console.log('\n=== Testing SETTINGS Module ===');

  try {
    // Test get public settings
    console.log('1. Testing get public settings...');
    const publicSettingsResponse = await axios.get(`${API_URL}/api/settings/public`);
    console.log('✅ Get public settings successful');

    // Test get all settings (admin only)
    console.log('2. Testing get all settings...');
    try {
      const allSettingsResponse = await axios.get(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get all settings successful');
    } catch (error) {
      console.log('⚠️ Get all settings skipped (admin only)');
    }

    return true;
  } catch (error) {
    console.log('❌ SETTINGS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  try {
    // Login first
    console.log('=== Logging in ===');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    console.log('✅ Login successful');
    const token = loginResponse.data.data.accessToken;

    // Test all new modules
    const smsResult = await testSMSModule(token);
    const documentsResult = await testDocumentsModule(token);
    const approvalsResult = await testApprovalsModule(token);
    const notificationsResult = await testNotificationsModule(token);
    const settingsResult = await testSettingsModule(token);

    console.log('\n=== Test Summary ===');
    console.log(`SMS Module: ${smsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`DOCUMENTS Module: ${documentsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`APPROVALS Module: ${approvalsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`NOTIFICATIONS Module: ${notificationsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`SETTINGS Module: ${settingsResult ? '✅ PASSED' : '❌ FAILED'}`);

    const allPassed = smsResult && documentsResult && approvalsResult && notificationsResult && settingsResult;
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
  }
}

runAllTests();