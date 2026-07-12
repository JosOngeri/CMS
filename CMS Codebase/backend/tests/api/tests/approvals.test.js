/**
 * approvals.test.js
 *
 * Test suite for approval endpoints.
 *
 * Mocking strategy
 * -----------------
 *  * config/database -- all SQL calls go to jest.fn()
 */

jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    end: jest.fn(),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

const request  = require('supertest');
const app      = require('../../../server');
const db       = require('../../../config/database');
const { createAdminToken, createPastorToken, seedTestApproval, seedTestUser } = require('../setup/test-helpers');

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockReset();
  db.pool.query.mockReset();
  db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

// =============================================================================
// GET /api/approvals
// =============================================================================
describe('GET /api/approvals', () => {
  it('returns 200 and approvals list for authenticated user', async () => {
    const approvals = [
      seedTestApproval({ id: 1, title: 'Approval 1' }),
      seedTestApproval({ id: 2, title: 'Approval 2' }),
    ];
    db.query.mockResolvedValueOnce({ rows: approvals, rowCount: 2 });

    const res = await request(app)
      .get('/api/approvals')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approvals).toHaveLength(2);
  });

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/approvals');
    expect(res.status).toBe(401);
  });

  it('supports filter parameter', async () => {
    const approvals = [seedTestApproval({ id: 1, status: 'pending' })];
    db.query.mockResolvedValueOnce({ rows: approvals, rowCount: 1 });

    const res = await request(app)
      .get('/api/approvals?filter=pending')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// PUT /api/approvals/:id/approve
// =============================================================================
describe('PUT /api/approvals/:id/approve', () => {
  it('returns 200 when approving a request', async () => {
    const approval = seedTestApproval({ id: 1, status: 'pending' });
    db.query
      .mockResolvedValueOnce({ rows: [approval], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...approval, status: 'approved' }], rowCount: 1 });

    const res = await request(app)
      .put('/api/approvals/1/approve')
      .set('x-auth-token', createPastorToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when user lacks approval permission', async () => {
    const memberToken = createMemberToken();
    const res = await request(app)
      .put('/api/approvals/1/approve')
      .set('x-auth-token', memberToken);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).put('/api/approvals/1/approve');
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// PUT /api/approvals/:id/reject
// =============================================================================
describe('PUT /api/approvals/:id/reject', () => {
  it('returns 200 when rejecting a request', async () => {
    const approval = seedTestApproval({ id: 1, status: 'pending' });
    db.query
      .mockResolvedValueOnce({ rows: [approval], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...approval, status: 'rejected' }], rowCount: 1 });

    const res = await request(app)
      .put('/api/approvals/1/reject')
      .set('x-auth-token', createPastorToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// PUT /api/approvals/:id/delegate
// =============================================================================
describe('PUT /api/approvals/:id/delegate', () => {
  it('returns 200 when delegating a request', async () => {
    const approval = seedTestApproval({ id: 1, status: 'pending' });
    db.query
      .mockResolvedValueOnce({ rows: [approval], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...approval, delegated_to: 2 }], rowCount: 1 });

    const res = await request(app)
      .put('/api/approvals/1/delegate')
      .send({ delegateTo: 2 })
      .set('x-auth-token', createPastorToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// GET /api/approvals/workflows
// =============================================================================
describe('GET /api/approvals/workflows', () => {
  it('returns 200 and workflows list', async () => {
    const workflows = [
      { id: 1, name: 'Workflow 1', steps: [] },
      { id: 2, name: 'Workflow 2', steps: [] },
    ];
    db.query.mockResolvedValueOnce({ rows: workflows, rowCount: 2 });

    const res = await request(app)
      .get('/api/approvals/workflows')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.workflows).toHaveLength(2);
  });
});

// =============================================================================
// POST /api/approvals/workflows
// =============================================================================
describe('POST /api/approvals/workflows', () => {
  it('returns 200 when creating a workflow', async () => {
    const workflow = { id: 1, name: 'New Workflow', description: 'Test', steps: [] };
    db.query.mockResolvedValueOnce({ rows: [workflow], rowCount: 1 });

    const res = await request(app)
      .post('/api/approvals/workflows')
      .send({ name: 'New Workflow', description: 'Test', steps: [] })
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when user lacks permission', async () => {
    const res = await request(app)
      .post('/api/approvals/workflows')
      .send({ name: 'New Workflow' })
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(403);
  });
});

// =============================================================================
// GET /api/approvals/analytics
// =============================================================================
describe('GET /api/approvals/analytics', () => {
  it('returns 200 and analytics data', async () => {
    const analytics = { total: 100, approved: 80, rejected: 10, pending: 10, avg_hours: 24.5 };
    db.query.mockResolvedValueOnce({ rows: [analytics], rowCount: 1 });

    const res = await request(app)
      .get('/api/approvals/analytics')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics).toBeDefined();
  });
});
