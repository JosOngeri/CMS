/**
 * Integration Tests for SMS Hub API Endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the server setup
const app = express();
app.use(express.json());

// Import routes (mocked)
const smsHubRoutes = require('../../routes/smsHub.routes');

describe('SMS Hub API Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Setup: Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@kmaincms.test',
        password: 'TestPassword123!'
      });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.accessToken;
    }
  });

  describe('GET /api/sms-hub/providers', () => {
    it('should get all SMS providers', async () => {
      const response = await request(app)
        .get('/api/sms-hub/providers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/sms-hub/providers');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/sms-hub/providers', () => {
    it('should create new SMS provider', async () => {
      const newProvider = {
        name: 'Test Provider',
        url: 'https://test-provider.api',
        apiKey: 'test-api-key',
        priority: 1,
        is_active: true
      };

      const response = await request(app)
        .post('/api/sms-hub/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProvider);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Test Provider');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/sms-hub/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' }); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/sms-hub/send', () => {
    it('should send SMS successfully', async () => {
      const smsData = {
        phone: '254712345678',
        message: 'Test message from integration test'
      };

      const response = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smsData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('messageId');
    });

    it('should validate phone number format', async () => {
      const smsData = {
        phone: 'invalid-phone',
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smsData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate message length', async () => {
      const smsData = {
        phone: '254712345678',
        message: 'A'.repeat(2000) // Too long
      };

      const response = await request(app)
        .post('/api/sms-hub/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smsData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/sms-hub/send-bulk', () => {
    it('should send bulk SMS', async () => {
      const bulkData = {
        recipients: ['254712345678', '254798765432'],
        message: 'Bulk test message'
      };

      const response = await request(app)
        .post('/api/sms-hub/send-bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sentCount');
    });

    it('should handle empty recipient list', async () => {
      const bulkData = {
        recipients: [],
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/sms-hub/send-bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/sms-hub/health', () => {
    it('should check SMS hub health', async () => {
      const response = await request(app)
        .get('/api/sms-hub/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('providers');
    });
  });

  describe('PUT /api/sms-hub/providers/:id', () => {
    it('should update SMS provider', async () => {
      const updateData = {
        name: 'Updated Provider Name',
        is_active: false
      };

      const response = await request(app)
        .put('/api/sms-hub/providers/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .put('/api/sms-hub/providers/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/sms-hub/providers/:id', () => {
    it('should delete SMS provider', async () => {
      const response = await request(app)
        .delete('/api/sms-hub/providers/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
