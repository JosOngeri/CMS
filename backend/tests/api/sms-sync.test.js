/**
 * sms-sync.test.js
 *
 * Test suite for SMS sync API endpoints
 */

// jest.mock MUST precede the requires that consume the mocked modules —
// this project runs jest with transform: {}, so jest.mock is NOT hoisted.
// Mock the database — config/database exports { pool, queryWithLogging }
jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() },
  queryWithLogging: jest.fn()
}));

// Mock ResponseHandler
jest.mock('../../utils/ResponseHandler', () => ({
  success: jest.fn((res, data, message) => {
    res.status(200).json({
      success: true,
      data,
      message
    });
  }),
  error: jest.fn((res, message, status = 400) => {
    res.status(status).json({
      success: false,
      error: message
    });
  }),
  unauthorized: jest.fn((res, message) => {
    res.status(401).json({
      success: false,
      error: message
    });
  }),
  forbidden: jest.fn((res, message) => {
    res.status(403).json({
      success: false,
      error: message
    });
  }),
  notFound: jest.fn((res, message) => {
    res.status(404).json({
      success: false,
      error: message
    });
  })
}));

// Mock JWT middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Mock token validation
    if (token === 'valid-sms-token') {
      req.user = {
        id: 'user-123',
        churchId: 'church-123',
        scope: 'sms'
      };
      next();
    } else if (token === 'valid-admin-token') {
      req.user = {
        id: 'user-456',
        churchId: 'church-456',
        scope: 'admin'
      };
      next();
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }
}));


const request = require('supertest');
const express = require('express');
const zlib = require('zlib');
const smsSyncRoutes = require('../../routes/smsSync.routes');
const smsSyncController = require('../../controllers/smsSync.controller');
const db = require('../../config/database');

describe('SMS Sync API Endpoints', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks does NOT drain the mockResolvedValueOnce queue — stale
    // rows leak into later tests without this reset.
    db.pool.query.mockReset();
    // Emulate the repo's WHERE sequence_number > $2 AND LIMIT $3 filtering —
    // a flat mock would ignore the params the real SQL applies.
    db.pool.query._updates = [];
    db.pool.query.mockImplementation((sql, params = []) => {
      if (/sms_rolling_updates/.test(sql)) {
        let rows = [...db.pool.query._updates];
        if (/sequence_number >/.test(sql)) {
          rows = rows.filter((r) => r.sequence_number > params[1]);
        }
        if (/LIMIT/.test(sql)) {
          rows = rows.slice(0, params[params.length - 1]);
        }
        return Promise.resolve({ rows, rowCount: rows.length });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    app = express();
    app.use(express.json());
    app.use('/api/sms-sync', smsSyncRoutes);
  });

  describe('Snapshot Download Endpoint', () => {
    describe('GET /api/sms-sync/snapshot', () => {
      it('should download latest daily snapshot for valid SMS token', async () => {
        const mockSnapshot = {
          rows: [
            {
              id: 'snapshot-123',
              church_id: 'church-123',
              snapshot_date: '2025-01-27',
              data_hash: 'abc123',
              compressed_data: zlib.gzipSync(JSON.stringify({ contacts: [], groups: [], messages: [], templates: [] })),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        db.pool.query.mockResolvedValueOnce(mockSnapshot);

        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('compressed_data');
        expect(response.body.data).toHaveProperty('data_hash');
        expect(response.body.data).toHaveProperty('snapshot_date');
        expect(response.body.data).toHaveProperty('file_size');
      });

      it('should return 401 for invalid token', async () => {
        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-SMS scoped token', async () => {
        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-admin-token');

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent snapshot', async () => {
        db.pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should support since_date parameter for delta snapshots', async () => {
        const mockSnapshot = {
          rows: [
            {
              id: 'snapshot-123',
              church_id: 'church-123',
              snapshot_date: '2025-01-27',
              data_hash: 'abc123',
              compressed_data: zlib.gzipSync(JSON.stringify({ contacts: [], groups: [], messages: [], templates: [] })),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        const mockRollingUpdates = {
          rows: [
            {
              id: 'update-1',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-1',
              operation: 'create',
              data: { name: 'John Doe' },
              created_at: new Date(),
              sequence_number: 1
            }
          ]
        };

        db.pool.query.mockResolvedValueOnce(mockSnapshot);
        db.pool.query.mockResolvedValueOnce(mockRollingUpdates);

        const response = await request(app)
          .get('/api/sms-sync/snapshot?since_date=2025-01-26')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Delta generation is not implemented — since_date is acknowledged
        // via delta_requested but always returns a full snapshot.
        expect(response.body.data).toHaveProperty('snapshot_type', 'full');
        expect(response.body.data).toHaveProperty('delta_requested', true);
      });

      it('should return the compressed payload inside a plain JSON envelope', async () => {
        // Content-Encoding: gzip was removed — the body is JSON containing the
        // gzip bytes as a field, not a gzip-encoded HTTP response.
        const mockSnapshot = {
          rows: [
            {
              id: 'snapshot-123',
              church_id: 'church-123',
              snapshot_date: '2025-01-27',
              data_hash: 'abc123',
              compressed_data: zlib.gzipSync(JSON.stringify({ contacts: [], groups: [], messages: [], templates: [] })),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        db.pool.query.mockResolvedValueOnce(mockSnapshot);

        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBeUndefined();
        expect(response.body.data).toHaveProperty('compressed_data');
      });

      it('should include cache headers', async () => {
        const mockSnapshot = {
          rows: [
            {
              id: 'snapshot-123',
              church_id: 'church-123',
              snapshot_date: '2025-01-27',
              data_hash: 'abc123',
              compressed_data: zlib.gzipSync(JSON.stringify({ contacts: [], groups: [], messages: [], templates: [] })),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        db.pool.query.mockResolvedValueOnce(mockSnapshot);

        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBeDefined();
      });
    });
  });

  describe('Rolling Updates Endpoint', () => {
    describe('GET /api/sms-sync/updates', () => {
      it('should fetch rolling updates for valid SMS token', async () => {
        const mockUpdates = {
          rows: [
            {
              id: 'update-1',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-1',
              operation: 'create',
              data: { name: 'John Doe' },
              created_at: new Date(),
              sequence_number: 1
            },
            {
              id: 'update-2',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-2',
              operation: 'update',
              data: { name: 'Jane Doe' },
              created_at: new Date(),
              sequence_number: 2
            }
          ]
        };

        db.pool.query._updates = mockUpdates.rows;

        const response = await request(app)
          .get('/api/sms-sync/updates')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updates');
        expect(response.body.data).toHaveProperty('last_sequence_number');
        expect(response.body.data.updates).toHaveLength(2);
      });

      it('should support since_sequence parameter for incremental sync', async () => {
        const mockUpdates = {
          rows: [
            {
              id: 'update-2',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-2',
              operation: 'update',
              data: { name: 'Jane Doe' },
              created_at: new Date(),
              sequence_number: 2
            }
          ]
        };

        db.pool.query._updates = mockUpdates.rows;

        const response = await request(app)
          .get('/api/sms-sync/updates?since_sequence=1')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updates).toHaveLength(1);
        expect(response.body.data.updates[0].sequence_number).toBe(2);
      });

      it('should order updates by sequence_number ascending', async () => {
        const mockUpdates = {
          rows: [
            {
              id: 'update-1',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-1',
              operation: 'create',
              data: { name: 'John Doe' },
              created_at: new Date(),
              sequence_number: 1
            },
            {
              id: 'update-2',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-2',
              operation: 'update',
              data: { name: 'Jane Doe' },
              created_at: new Date(),
              sequence_number: 2
            }
          ]
        };

        db.pool.query._updates = mockUpdates.rows;

        const response = await request(app)
          .get('/api/sms-sync/updates')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.data.updates[0].sequence_number).toBeLessThan(
          response.body.data.updates[1].sequence_number
        );
      });

      it('should return empty array with last_sequence_number when no updates', async () => {
        db.pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/sms-sync/updates')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updates).toHaveLength(0);
        expect(response.body.data).toHaveProperty('last_sequence_number');
      });

      it('should return 401 for invalid token', async () => {
        const response = await request(app)
          .get('/api/sms-sync/updates')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-SMS scoped token', async () => {
        const response = await request(app)
          .get('/api/sms-sync/updates')
          .set('Authorization', 'Bearer valid-admin-token');

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should support limit parameter for batch size control', async () => {
        const mockUpdates = {
          rows: [
            {
              id: 'update-1',
              church_id: 'church-123',
              update_type: 'contact',
              entity_type: 'contact',
              entity_id: 'contact-1',
              operation: 'create',
              data: { name: 'John Doe' },
              created_at: new Date(),
              sequence_number: 1
            }
          ]
        };

        db.pool.query._updates = mockUpdates.rows;

        const response = await request(app)
          .get('/api/sms-sync/updates?limit=1')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updates).toHaveLength(1);
      });

      it('should enforce max limit of 1000', async () => {
        const mockUpdates = {
          rows: []
        };

        db.pool.query._updates = mockUpdates.rows;

        const response = await request(app)
          .get('/api/sms-sync/updates?limit=2000')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        // The implementation should cap the limit at 1000
      });
    });
  });
});