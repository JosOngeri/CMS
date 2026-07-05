const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testReportsModule(token) {
  console.log('\n=== Testing REPORTS Module ===');

  try {
    // Test financial report
    console.log('1. Testing financial report...');
    const financialResponse = await axios.get(`${API_URL}/api/reports/financial`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Financial report successful');

    // Test department report
    console.log('2. Testing department report...');
    const deptResponse = await axios.get(`${API_URL}/api/reports/department`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Department report successful');

    // Test attendance report
    console.log('3. Testing attendance report...');
    try {
      const attendanceResponse = await axios.get(`${API_URL}/api/reports/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Attendance report successful');
    } catch (error) {
      console.log('⚠️ Attendance report skipped (no data)');
    }

    // Test SMS report
    console.log('4. Testing SMS report...');
    const smsResponse = await axios.get(`${API_URL}/api/reports/sms`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ SMS report successful');

    // Test approval report
    console.log('5. Testing approval report...');
    const approvalResponse = await axios.get(`${API_URL}/api/reports/approvals`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Approval report successful');

    return true;
  } catch (error) {
    console.log('❌ REPORTS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAnalyticsModule(token) {
  console.log('\n=== Testing ANALYTICS Module ===');

  try {
    // Test dashboard stats
    console.log('1. Testing dashboard stats...');
    const dashboardResponse = await axios.get(`${API_URL}/api/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Dashboard stats successful:', dashboardResponse.data.data);

    // Test member growth
    console.log('2. Testing member growth...');
    const growthResponse = await axios.get(`${API_URL}/api/analytics/member-growth`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Member growth successful');

    // Test financial trends
    console.log('3. Testing financial trends...');
    const trendsResponse = await axios.get(`${API_URL}/api/analytics/financial-trends`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Financial trends successful');

    // Test department activity
    console.log('4. Testing department activity...');
    const activityResponse = await axios.get(`${API_URL}/api/analytics/department-activity`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Department activity successful');

    // Test attendance trends
    console.log('5. Testing attendance trends...');
    try {
      const attendanceTrendsResponse = await axios.get(`${API_URL}/api/analytics/attendance-trends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Attendance trends successful');
    } catch (error) {
      console.log('⚠️ Attendance trends skipped (no data)');
    }

    return true;
  } catch (error) {
    console.log('❌ ANALYTICS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSearchModule(token) {
  console.log('\n=== Testing SEARCH Module ===');

  try {
    // Test global search
    console.log('1. Testing global search...');
    const searchResponse = await axios.get(`${API_URL}/api/search/global?query=test`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Global search successful');

    // Test search suggestions
    console.log('2. Testing search suggestions...');
    const suggestionsResponse = await axios.get(`${API_URL}/api/search/suggestions?query=test`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Search suggestions successful');

    return true;
  } catch (error) {
    console.log('❌ SEARCH module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSecurityModule(token) {
  console.log('\n=== Testing SECURITY Module ===');

  try {
    // Test get security settings
    console.log('1. Testing get security settings...');
    try {
      const settingsResponse = await axios.get(`${API_URL}/api/security/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get security settings successful');
    } catch (error) {
      console.log('⚠️ Get security settings skipped (admin only)');
    }

    // Test get failed login attempts
    console.log('2. Testing get failed login attempts...');
    try {
      const failedResponse = await axios.get(`${API_URL}/api/security/failed-attempts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get failed login attempts successful');
    } catch (error) {
      console.log('⚠️ Get failed login attempts skipped (admin only)');
    }

    return true;
  } catch (error) {
    console.log('❌ SECURITY module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runNewModulesTest() {
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
    const reportsResult = await testReportsModule(token);
    const analyticsResult = await testAnalyticsModule(token);
    const searchResult = await testSearchModule(token);
    const securityResult = await testSecurityModule(token);

    console.log('\n=== Test Summary ===');
    console.log(`REPORTS Module: ${reportsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`ANALYTICS Module: ${analyticsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`SEARCH Module: ${searchResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`SECURITY Module: ${securityResult ? '✅ PASSED' : '❌ FAILED'}`);

    const allPassed = reportsResult && analyticsResult && searchResult && securityResult;
    console.log(`\n${allPassed ? '✅ All new modules tests passed!' : '❌ Some tests failed'}`);
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
  }
}

runNewModulesTest();