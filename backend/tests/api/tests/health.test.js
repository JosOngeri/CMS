/**
 * health.test.js
 *
 * Smoke-test for GET /health.
 * This is intentionally the simplest test file – it verifies that the Express
 * app loads correctly and the health endpoint responds as expected.
 *
 * DB is mocked so no real PostgreSQL connection is needed.
 */

// ── Mock DB before app is required ────────────────────────────────────────────
jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    end: jest.fn(),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

const request = require('supertest');
const app     = require('../../../app');

// ─────────────────────────────────────────────────────────────────────────────

describe('Health Check – GET /api/health', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns JSON body with status + database fields', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toMatchObject({ status: 'healthy', database: 'connected' });
    expect(res.body.timestamp).toBeDefined();
  });

  it('responds with Content-Type application/json', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('does NOT require an auth token', async () => {
    // Health check is public – no x-auth-token header supplied
    const res = await request(app).get('/api/health');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
