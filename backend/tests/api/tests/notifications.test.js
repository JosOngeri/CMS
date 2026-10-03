/**
 * notifications.test.js
 *
 * Test suite for notification endpoints.
 */

jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    end: jest.fn(),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

jest.mock('../../../services/IdentityService', () => ({
  getIdentity: jest.fn(),
  invalidateIdentityCache: jest.fn(),
}));

const request  = require('supertest');
const app      = require('../../../app');
const db       = require('../../../config/database');
const IdentityService = require('../../../services/IdentityService');
const { createAdminToken, createMemberToken, seedTestNotification, identityFor } = require('../setup/test-helpers');

beforeEach(() => {
  jest.clearAllMocks();
  IdentityService.getIdentity.mockImplementation((userId) => {
    const identity = identityFor(userId);
    return identity ? Promise.resolve(identity) : Promise.reject(new Error('User not found'));
  });
  db.pool.query.mockReset();
  db.pool.query.mockReset();
  db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

// =============================================================================
// GET /api/notifications
// =============================================================================
describe('GET /api/notifications', () => {
  it('returns 200 and notifications list for authenticated user', async () => {
    const notifications = [
      seedTestNotification({ id: 1, title: 'Notification 1' }),
      seedTestNotification({ id: 2, title: 'Notification 2' }),
    ];
    db.pool.query.mockResolvedValueOnce({ rows: notifications, rowCount: 2 });

    const res = await request(app)
      .get('/api/notifications')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('supports filter parameter', async () => {
    const notifications = [seedTestNotification({ id: 1, type: 'alert' })];
    db.pool.query.mockResolvedValueOnce({ rows: notifications, rowCount: 1 });

    const res = await request(app)
      .get('/api/notifications?filter=alert')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// POST /api/notifications/:id/read
// =============================================================================
describe('POST /api/notifications/:id/read', () => {
  it('returns 200 when marking a notification as read', async () => {
    const notification = seedTestNotification({ id: 1, is_read: false });
    db.pool.query
      .mockResolvedValueOnce({ rows: [notification], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...notification, is_read: true }], rowCount: 1 });

    const res = await request(app)
      .post('/api/notifications/1/read')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// POST /api/notifications/mark-all-read
// =============================================================================
describe('POST /api/notifications/mark-all-read', () => {
  it('returns 200 when marking all notifications as read', async () => {
    db.pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// GET /api/notifications/preferences
// =============================================================================
describe('GET /api/notifications/preferences', () => {
  it('returns 200 and user notification preferences', async () => {
    const preferences = { email: true, sms: false, in_app: true };
    db.pool.query.mockResolvedValueOnce({ rows: [preferences], rowCount: 1 });

    const res = await request(app)
      .get('/api/notifications/preferences')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// PUT /api/notifications/preferences
// =============================================================================
describe('PUT /api/notifications/preferences', () => {
  it('returns 200 when updating preferences', async () => {
    const preferences = { email: false, sms: true, in_app: true };
    db.pool.query.mockResolvedValueOnce({ rows: [preferences], rowCount: 1 });

    const res = await request(app)
      .put('/api/notifications/preferences')
      .send({ preferences: { email_enabled: false, sms_enabled: true, in_app_enabled: true } })
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
