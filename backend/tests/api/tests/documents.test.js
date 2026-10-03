/**
 * documents.test.js
 *
 * Test suite for document endpoints.
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
const { createAdminToken, createMemberToken, seedTestDocument, identityFor } = require('../setup/test-helpers');

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
// GET /api/documents
// =============================================================================
describe('GET /api/documents', () => {
  it('returns 200 and documents list for authenticated user', async () => {
    const documents = [
      seedTestDocument({ id: 1, name: 'Document 1.pdf' }),
      seedTestDocument({ id: 2, name: 'Document 2.pdf' }),
    ];
    db.pool.query.mockResolvedValueOnce({ rows: documents, rowCount: 2 });

    const res = await request(app)
      .get('/api/documents')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// POST /api/documents/upload
// =============================================================================
describe('POST /api/documents/upload', () => {
  it('returns 201 when uploading a document', async () => {
    const document = seedTestDocument({ id: 1 });
    db.pool.query.mockResolvedValueOnce({ rows: [document], rowCount: 1 });

    const res = await request(app)
      .post('/api/documents/upload')
      .attach('files', Buffer.from('%PDF-1.4 test'), 'test-document.pdf')
      .field('name', 'Test Document.pdf')
      .field('description', 'Test description')
      .field('category', 'policies')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// DELETE /api/documents/:id
// =============================================================================
describe('DELETE /api/documents/:id', () => {
  it('returns 200 when deleting a document', async () => {
    const document = seedTestDocument({ id: 1 });
    db.pool.query.mockResolvedValueOnce({ rows: [document], rowCount: 1 });
    db.pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .delete('/api/documents/1')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when user lacks permission', async () => {
    const res = await request(app)
      .delete('/api/documents/1')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(403);
  });
});

// =============================================================================
// PUT /api/documents/:id
// =============================================================================
describe('PUT /api/documents/:id', () => {
  it('returns 200 when updating a document', async () => {
    const document = seedTestDocument({ id: 1 });
    db.pool.query
      .mockResolvedValueOnce({ rows: [document], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...document, name: 'Updated.pdf' }], rowCount: 1 });

    const res = await request(app)
      .put('/api/documents/1')
      .send({ name: 'Updated.pdf', description: 'Updated description' })
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
