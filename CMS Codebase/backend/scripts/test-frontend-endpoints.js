const axios = require('axios');
const { pool } = require('../config/database');

const API = 'http://localhost:5005';

const ENDPOINTS = [
  { method: 'post', path: '/api/auth/login', body: { email: 'admin@sda.org', password: 'admin123' }, expectToken: true },
  { method: 'get', path: '/api/auth/profile', auth: true },
  { method: 'get', path: '/api/users/me', auth: true },
  { method: 'get', path: '/api/members', auth: true },
  { method: 'get', path: '/api/members/stats', auth: true },
  { method: 'get', path: '/api/departments', auth: true },
  { method: 'get', path: '/api/department-categories', auth: true },
  { method: 'get', path: '/api/announcements', auth: true },
  { method: 'get', path: '/api/gallery/albums', auth: true },
  { method: 'get', path: '/api/gallery/photos', auth: true },
  { method: 'get', path: '/api/gallery/photos/paginated', auth: true },
  { method: 'get', path: '/api/gallery/photos/search?search=test', auth: true },
  { method: 'get', path: '/api/gallery/tags', auth: true },
  { method: 'get', path: '/api/telegram/auth-methods', auth: true },
  { method: 'get', path: '/api/documents', auth: true },
  { method: 'get', path: '/api/content', auth: true },
  { method: 'get', path: '/api/payments', auth: true },
  { method: 'get', path: '/api/payments/categories', auth: true },
  { method: 'get', path: '/api/treasury/journal-entries', auth: true },
  { method: 'get', path: '/api/treasury/expenses', auth: true },
  { method: 'get', path: '/api/treasury/budgets/alerts', auth: true },
  { method: 'get', path: '/api/approvals', auth: true },
  { method: 'get', path: '/api/events', auth: true },
  { method: 'get', path: '/api/events/rsvps', auth: true },
  { method: 'get', path: '/api/settings', auth: true },
  { method: 'get', path: '/api/security/logs', auth: true },
  { method: 'get', path: '/api/security/settings', auth: true },
  { method: 'get', path: '/api/audit-logs', auth: true },
  { method: 'get', path: '/api/reports', auth: true },
  { method: 'get', path: '/api/reports/123/download', auth: true },
  { method: 'get', path: '/api/notifications', auth: true },
  { method: 'get', path: '/api/churches', auth: true },
];

async function run() {
  let token = null;
  let passed = 0;
  let failed = 0;

  for (const ep of ENDPOINTS) {
    try {
      const config = {};
      if (ep.auth) config.headers = { Authorization: `Bearer ${token}` };
      let response;
      if (ep.method === 'post') {
        response = await axios.post(`${API}${ep.path}`, ep.body, config);
      } else {
        response = await axios.get(`${API}${ep.path}`, config);
      }
      console.log(`OK ${ep.method.toUpperCase()} ${ep.path} => ${response.status}`);
      if (ep.expectToken) token = response.data?.data?.accessToken || response.data?.token;
      passed++;
    } catch (error) {
      failed++;
      const status = error.response?.status;
      const data = error.response?.data;
      console.error(`FAIL ${ep.method.toUpperCase()} ${ep.path} => ${status || error.message}`, data?.error || data?.details || '');
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run();
