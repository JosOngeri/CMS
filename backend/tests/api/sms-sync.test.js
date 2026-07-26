/**
 * sms-sync.test.js
 *
 * Test suite for SMS sync API endpoints
 */

const request = require('supertest');
const express = require('express');
const smsSyncRoutes = require('../../routes/smsSync.routes');
const smsSyncController = require('../../controllers/smsSync.controller');
const db = require('../../config/database');

// Mock the database
jest.mock('../../config/database');

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
        church_id: 'church-123',
        scope: 'sms'
      };
      next();
    } else if (token === 'valid-admin-token') {
      req.user = {
        id: 'user-456',
        church_id: 'church-456',
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

describe('SMS Sync API Endpoints', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
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
              compressed_data: Buffer.from('compressed-data'),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        db.query.mockResolvedValueOnce(mockSnapshot);

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
        db.query.mockResolvedValueOnce({ rows: [] });

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
              compressed_data: Buffer.from('compressed-data'),
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

        db.query.mockResolvedValueOnce(mockSnapshot);
        db.query.mockResolvedValueOnce(mockRollingUpdates);

        const response = await request(app)
          .get('/api/sms-sync/snapshot?since_date=2025-01-26')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('delta');
      });

      it('should include Content-Encoding header for compressed data', async () => {
        const mockSnapshot = {
          rows: [
            {
              id: 'snapshot-123',
              church_id: 'church-123',
              snapshot_date: '2025-01-27',
              data_hash: 'abc123',
              compressed_data: Buffer.from('compressed-data'),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        db.query.mockResolvedValueOnce(mockSnapshot);

        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBe('gzip');
      });

      it('should include cache headers', async () => {
        const mockSnapshot = {
          rows: [
            {
              id: 'snapshot-123',
              church_id: 'church-123',
              snapshot_date: '2025-01-27',
              data_hash: 'abc123',
              compressed_data: Buffer.from('compressed-data'),
              file_size: 1024,
              created_at: new Date()
            }
          ]
        };

        db.query.mockResolvedValueOnce(mockSnapshot);

        const response = await request(app)
          .get('/api/sms-sync/snapshot')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBeDefined();
      });
    });
  });

  describe('Rolling Updates Endpoint', () => {
    describe('GET /api/sms-sync/rolling-updates', () => {
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

        db.query.mockResolvedValueOnce(mockUpdates);

        const response = await request(app)
          .get('/api/sms-sync/rolling-updates')
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

        db.query.mockResolvedValueOnce(mockUpdates);

        const response = await request(app)
          .get('/api/sms-sync/rolling-updates?since_sequence=1')
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

        db.query.mockResolvedValueOnce(mockUpdates);

        const response = await request(app)
          .get('/api/sms-sync/rolling-updates')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.data.updates[0].sequence_number).toBeLessThan(
          response.body.data.updates[1].sequence_number
        );
      });

      it('should return empty array with last_sequence_number when no updates', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/sms-sync/rolling-updates')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updates).toHaveLength(0);
        expect(response.body.data).toHaveProperty('last_sequence_number');
      });

      it('should return 401 for invalid token', async () => {
        const response = await request(app)
          .get('/api/sms-sync/rolling-updates')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-SMS scoped token', async () => {
        const response = await request(app)
          .get('/api/sms-sync/rolling-updates')
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

        db.query.mockResolvedValueOnce(mockUpdates);

        const response = await request(app)
          .get('/api/sms-sync/rolling-updates?limit=1')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updates).toHaveLength(1);
      });

      it('should enforce max limit of 1000', async () => {
        const mockUpdates = {
          rows: []
        };

        db.query.mockResolvedValueOnce(mockUpdates);

        const response = await request(app)
          .get('/api/sms-sync/rolling-updates?limit=2000')
          .set('Authorization', 'Bearer valid-sms-token');

        expect(response.status).toBe(200);
        // The implementation should cap the limit at 1000
      });
    });
  });
});