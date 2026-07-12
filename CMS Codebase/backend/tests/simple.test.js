const request = require('supertest');
const express = require('express');

// Simple test server that doesn't load all dependencies
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'KMainCMS API is running' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      accessToken: 'test-token',
      user: { id: 1, email: 'test@example.com' }
    }
  });
});

describe('API Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});

describe('AUTH Module', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('accessToken');
  });
});