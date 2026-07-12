const axios = require('axios');

const API = 'http://localhost:5005';

async function get(url, token) {
  return axios.get(`${API}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

async function testData() {
  try {
    // Login and capture token
    const loginResponse = await axios.post(`${API}/api/auth/login`, {
      email: 'admin@sda.org',
      password: 'admin123'
    });
    const token = loginResponse.data.data.accessToken;
    console.log('Login: OK');
    console.log('Token:', token ? 'captured' : 'none');

    // Test endpoints
    const endpoints = [
      '/api/members',
      '/api/users',
      '/api/departments',
      '/api/gallery/albums',
      '/api/announcements',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await get(endpoint, token);
        const data = response.data;
        console.log(`${endpoint}: status ${response.status}, success=${data.success}, items=${Array.isArray(data.data) ? data.data.length : (data.data ? 1 : 0)}`);
      } catch (error) {
        console.error(`${endpoint}: status ${error.response?.status || 'ERR'}, data=${JSON.stringify(error.response?.data)}`);
      }
    }
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testData();
