/**
 * Integration Tests for SMS Hub API Endpoints
 *
 * Exercises the real Express app against the routes that exist in
 * routes/smsHub.routes.js:
 *   POST /api/sms-hub/send                    (Super Admin/Pastor/Treasurer/Department Head)
 *   GET  /api/sms-hub/providers/status        (Super Admin)
 *   GET  /api/sms-hub/providers/:provider/status (Super Admin)
 *   POST /api/sms-hub/providers/reload        (Super Admin)
 *   GET  /api/sms-hub/integrations/status     (Super Admin)
 *   GET  /api/sms-hub/integrations/:integration/health (Super Admin)
 */

const request = require('supertest');
const { app } = require('../../server');

const login = (email, password) =>
  request(app).post('/api/auth/login').send({ email, password });

describe('SMS Hub API Integration Tests', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await login('admin@msabato.test', 'TestPassword123!');
    adminToken = res.body.data && res.body.data.accessToken;
    expect(adminToken).toBeDefined();
  });

  describe('POST /api/sms-hub/send', () => {
    it('should queue SMS through the hybrid dispatcher', async () => {
      const response = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipients: ['254712345678'], message: 'Integration test message' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 when recipients is missing or empty', async () => {
      const response = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipients: [], message: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipients: ['254712345678'] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/sms-hub/send')
        .send({ recipients: ['254712345678'], message: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/sms-hub/providers/status', () => {
    it('should return provider statuses for Super Admin', async () => {
      const response = await request(app)
        .get('/api/sms-hub/providers/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/sms-hub/providers/status');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/sms-hub/providers/reload', () => {
    it('should reload providers for Super Admin', async () => {
      const response = await request(app)
        .post('/api/sms-hub/providers/reload')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/sms-hub/integrations/status', () => {
    it('should return integration statuses for Super Admin', async () => {
      const response = await request(app)
        .get('/api/sms-hub/integrations/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
