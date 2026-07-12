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

const request  = require('supertest');
const app      = require('../../../server');
const db       = require('../../../config/database');
const { createAdminToken, createMemberToken, seedTestDocument } = require('../setup/test-helpers');

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockReset();
  db.pool.query.mockReset();
  db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
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
    db.query.mockResolvedValueOnce({ rows: documents, rowCount: 2 });

    const res = await request(app)
      .get('/api/documents')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.documents).toHaveLength(2);
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
  it('returns 200 when uploading a document', async () => {
    const document = seedTestDocument({ id: 1 });
    db.query.mockResolvedValueOnce({ rows: [document], rowCount: 1 });

    const res = await request(app)
      .post('/api/documents/upload')
      .field('name', 'Test Document.pdf')
      .field('description', 'Test description')
      .field('category', 'policies')
      .set('x-auth-token', createAdminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// GET /api/documents/:id
// =============================================================================
describe('GET /api/documents/:id', () => {
  it('returns 200 and document details', async () => {
    const document = seedTestDocument({ id: 1 });
    db.query.mockResolvedValueOnce({ rows: [document], rowCount: 1 });

    const res = await request(app)
      .get('/api/documents/1')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.document).toBeDefined();
  });

  it('returns 404 when document not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/documents/999')
      .set('x-auth-token', createMemberToken());

    expect(res.status).toBe(404);
  });
});

// =============================================================================
// DELETE /api/documents/:id
// =============================================================================
describe('DELETE /api/documents/:id', () => {
  it('returns 200 when deleting a document', async () => {
    const document = seedTestDocument({ id: 1 });
    db.query.mockResolvedValueOnce({ rows: [document], rowCount: 1 });
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
    db.query
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
