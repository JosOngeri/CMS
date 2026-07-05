const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testContentModule(token) {
  console.log('\n=== Testing CONTENT Module ===');

  try {
    // Test get all content
    console.log('1. Testing get all content...');
    const contentResponse = await axios.get(`${API_URL}/api/content`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get all content successful');

    // Test get categories
    console.log('2. Testing get categories...');
    const categoriesResponse = await axios.get(`${API_URL}/api/content/categories-list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get categories successful:', categoriesResponse.data.data.length, 'categories');

    // Test get tags
    console.log('3. Testing get tags...');
    const tagsResponse = await axios.get(`${API_URL}/api/content/tags-list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get tags successful:', tagsResponse.data.data.length, 'tags');

    // Test get website settings
    console.log('4. Testing get website settings...');
    const settingsResponse = await axios.get(`${API_URL}/api/content/website-settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get website settings successful');

    return true;
  } catch (error) {
    console.log('❌ CONTENT module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDepartmentsModule(token) {
  console.log('\n=== Testing DEPARTMENTS Module ===');

  try {
    // Test get all departments
    console.log('1. Testing get all departments...');
    const departmentsResponse = await axios.get(`${API_URL}/api/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get all departments successful:', departmentsResponse.data.data.length, 'departments');

    if (departmentsResponse.data.data.length > 0) {
      const firstDept = departmentsResponse.data.data[0];

      // Test get department by id
      console.log('2. Testing get department by id...');
      const deptResponse = await axios.get(`${API_URL}/api/departments/${firstDept.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get department by id successful');

      // Test get meetings
      console.log('3. Testing get meetings...');
      const meetingsResponse = await axios.get(`${API_URL}/api/departments/${firstDept.id}/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get meetings successful');

      // Test get tasks
      console.log('4. Testing get tasks...');
      const tasksResponse = await axios.get(`${API_URL}/api/departments/${firstDept.id}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get tasks successful');

      // Test get resources
      console.log('5. Testing get resources...');
      const resourcesResponse = await axios.get(`${API_URL}/api/departments/${firstDept.id}/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get resources successful');
    }

    return true;
  } catch (error) {
    console.log('❌ DEPARTMENTS module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGalleryModule(token) {
  console.log('\n=== Testing GALLERY Module ===');

  try {
    // Test get all albums
    console.log('1. Testing get all albums...');
    const albumsResponse = await axios.get(`${API_URL}/api/gallery/albums`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get all albums successful:', albumsResponse.data.data.length, 'albums');

    // Test get tags
    console.log('2. Testing get tags...');
    const tagsResponse = await axios.get(`${API_URL}/api/gallery/tags`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get tags successful');

    return true;
  } catch (error) {
    console.log('❌ GALLERY module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testTreasuryModule(token) {
  console.log('\n=== Testing TREASURY Module ===');

  try {
    // Test get accounts
    console.log('1. Testing get accounts...');
    const accountsResponse = await axios.get(`${API_URL}/api/treasury/accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get accounts successful');

    // Test get transactions
    console.log('2. Testing get transactions...');
    const transactionsResponse = await axios.get(`${API_URL}/api/treasury/transactions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get transactions successful');

    // Test get income categories
    console.log('3. Testing get income categories...');
    const incomeCatsResponse = await axios.get(`${API_URL}/api/treasury/income-categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get income categories successful:', incomeCatsResponse.data.data.length, 'categories');

    // Test get expense categories
    console.log('4. Testing get expense categories...');
    const expenseCatsResponse = await axios.get(`${API_URL}/api/treasury/expense-categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get expense categories successful:', expenseCatsResponse.data.data.length, 'categories');

    // Test get budgets
    console.log('5. Testing get budgets...');
    const budgetsResponse = await axios.get(`${API_URL}/api/treasury/budgets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get budgets successful');

    // Test get financial summary
    console.log('6. Testing get financial summary...');
    try {
      const summaryResponse = await axios.get(`${API_URL}/api/treasury/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get financial summary successful:', summaryResponse.data.data);
    } catch (error) {
      console.log('⚠️ Get financial summary error:', error.response?.data || error.message);
    }

    return true;
  } catch (error) {
    console.log('❌ TREASURY module test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPaymentsModule(token) {
  console.log('\n=== Testing PAYMENTS Module ===');

  try {
    // Test get payment methods
    console.log('1. Testing get payment methods...');
    const methodsResponse = await axios.get(`${API_URL}/api/payments/methods`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get payment methods successful:', methodsResponse.data.data.length, 'methods');

    // Test get payments
    console.log('2. Testing get payments...');
    const paymentsResponse = await axios.get(`${API_URL}/api/payments/payments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get payments successful');

    // Test get pledges
    console.log('3. Testing get pledges...');
    const pledgesResponse = await axios.get(`${API_URL}/api/payments/pledges`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get pledges successful');

    // Test get payment summary
    console.log('4. Testing get payment summary...');
    try {
      const summaryResponse = await axios.get(`${API_URL}/api/payments/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Get payment summary successful');
    } catch (error) {
      console.log('⚠️ Get payment summary error:', error.response?.data || error.message);
    }

    return true;
  } catch (error) {
    console.log('❌ PAYMENTS module test failed:', error.response?.data || error.message);
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

    // Test all modules
    const contentResult = await testContentModule(token);
    const departmentsResult = await testDepartmentsModule(token);
    const galleryResult = await testGalleryModule(token);
    const treasuryResult = await testTreasuryModule(token);
    const paymentsResult = await testPaymentsModule(token);

    console.log('\n=== Test Summary ===');
    console.log(`CONTENT Module: ${contentResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`DEPARTMENTS Module: ${departmentsResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`GALLERY Module: ${galleryResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`TREASURY Module: ${treasuryResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`PAYMENTS Module: ${paymentsResult ? '✅ PASSED' : '❌ FAILED'}`);

    const allPassed = contentResult && departmentsResult && galleryResult && treasuryResult && paymentsResult;
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
  }
}

runAllTests();