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
const app     = require('../../../server');

// ─────────────────────────────────────────────────────────────────────────────

describe('Health Check – GET /health', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('returns JSON body { status: "ok", message: "KMainCMS API is running" }', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ status: 'ok', message: 'KMainCMS API is running' });
  });

  it('responds with Content-Type application/json', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('does NOT require an auth token', async () => {
    // Health check is public – no x-auth-token header supplied
    const res = await request(app).get('/health');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
