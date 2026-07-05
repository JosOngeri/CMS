const axios = require('axios');

const API = 'http://localhost:5005';

const endpoints = [
  // Auth / identity
  '/api/auth/profile',
  '/api/auth/me',
  '/api/users',
  '/api/users/me',

  // Members & people
  '/api/members',
  '/api/members/stats',

  // Departments
  '/api/departments',
  '/api/department-categories',

  // Announcements & communications
  '/api/announcements',
  '/api/announcements/public',
  '/api/sms',
  '/api/smsHub/status',
  '/api/telegram/status',

  // Gallery
  '/api/gallery/albums',
  '/api/gallery/photos',

  // Resources / documents
  '/api/documents',
  '/api/content',

  // Treasury / payments
  '/api/payments',
  '/api/treasury',
  '/api/treasury/dashboard',
  '/api/collections',
  '/api/pledges',

  // Approvals
  '/api/approvals',

  // Events
  '/api/events',

  // Insights / analytics
  '/api/analytics',
  '/api/dashboard',
  '/api/reports',
  '/api/performance',

  // Administration / settings
  '/api/settings',
  '/api/security',
  '/api/audit-logs',
  '/api/church',
  '/api/churches',

  // Notifications
  '/api/notifications',

  // Testing / monitoring
  '/api/testing',
  '/api/monitoring',

  // Mobile / SEO
  '/api/mobile',
  '/api/seo',
];

async function get(url, token) {
  try {
    const response = await axios.get(`${API}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 10000,
    });
    return { status: response.status, data: response.data, error: null };
  } catch (error) {
    return {
      status: error.response?.status || 'ERR',
      data: error.response?.data,
      error: error.message,
    };
  }
}

async function run() {
  // Login
  let token;
  try {
    const loginResponse = await axios.post(`${API}/api/auth/login`, {
      email: 'admin@sda.org',
      password: 'admin123',
    });
    token = loginResponse.data.data.accessToken;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return;
  }

  console.log('Testing protected routes with admin token...\n');
  for (const endpoint of endpoints) {
    const result = await get(endpoint, token);
    const icon = result.status === 200 ? 'OK' : (result.status === 401 || result.status === 403 ? 'AUTH' : 'FAIL');
    console.log(`${icon} ${endpoint} => ${result.status}`);
    if (result.status !== 200 && result.status !== 401 && result.status !== 403) {
      const msg = result.data?.error || result.data?.message || result.error || 'no details';
      console.log(`   ${msg}`);
    }
  }
}

run();
