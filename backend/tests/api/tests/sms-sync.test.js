/**
 * sms-sync.test.js
 *
 * Test suite for SMS sync API endpoints.
 */

// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key';

// Mock hibp before importing security
jest.mock('hibp', () => ({
  breachedAccount: jest.fn().mockResolvedValue(false),
  pwnedPasswordRange: jest.fn().mockResolvedValue(0)
}));

const smsSyncController = require('../../../controllers/smsSync.controller');
const SnapshotService = require('../../../services/SnapshotService');
const RollingUpdateService = require('../../../services/RollingUpdateService');

// Mock the services
const mockSnapshotService = {
  getLatestSnapshot: jest.fn(),
  getSnapshot: jest.fn()
};

const mockRollingUpdateService = {
  getRollingUpdates: jest.fn()
};

jest.mock('../../../services/SnapshotService', () => mockSnapshotService);
jest.mock('../../../services/RollingUpdateService', () => mockRollingUpdateService);

describe('SMS Sync API', () => {
  let mockReq, mockRes;
  let testChurchId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testChurchId = 'test-church-id';

    // Mock request and response objects
    mockReq = {
      user: {
        id: 'user-1',
        churchId: testChurchId,
        scope: ['sms']
      },
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    // Set the mock services on the controller
    smsSyncController.setServices({
      snapshotService: mockSnapshotService,
      rollingUpdateService: mockRollingUpdateService
    });
  });

  describe('downloadSnapshot', () => {
    it('should download latest daily snapshot for valid SMS token', async () => {
      const mockSnapshot = {
        id: 'snapshot-1',
        church_id: testChurchId,
        snapshot_date: '2024-01-01',
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100,
        data: {
          contacts: [{ id: 'contact-1' }],
          groups: [{ id: 'group-1' }],
          messages: [],
          templates: []
        }
      };

      mockSnapshotService.getLatestSnapshot.mockResolvedValue(mockSnapshot);

      await smsSyncController.downloadSnapshot(mockReq, mockRes);

      expect(mockSnapshotService.getLatestSnapshot).toHaveBeenCalledWith(testChurchId);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            compressed_data: mockSnapshot.compressed_data,
            data_hash: mockSnapshot.data_hash,
            snapshot_date: mockSnapshot.snapshot_date,
            file_size: mockSnapshot.file_size,
            record_counts: expect.any(Object)
          })
        })
      );
    });

    it('should return 401 for invalid token', async () => {
      mockReq.user = null;

      await smsSyncController.downloadSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required'
        })
      );
    });

    it('should return 403 for non-SMS scoped token', async () => {
      mockReq.user.scope = ['web'];

      await smsSyncController.downloadSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when no snapshot exists for the church', async () => {
      mockSnapshotService.getLatestSnapshot.mockResolvedValue(null);

      await smsSyncController.downloadSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should support since_date parameter for delta requests', async () => {
      const mockSnapshot = {
        id: 'snapshot-1',
        church_id: testChurchId,
        snapshot_date: '2024-01-01',
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100,
        data: {
          contacts: [],
          groups: [],
          messages: [],
          templates: []
        }
      };

      mockReq.query = { since_date: '2024-01-01' };
      mockSnapshotService.getLatestSnapshot.mockResolvedValue(mockSnapshot);

      await smsSyncController.downloadSnapshot(mockReq, mockRes);

      expect(mockSnapshotService.getLatestSnapshot).toHaveBeenCalledWith(testChurchId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing church_id in token', async () => {
      mockReq.user.churchId = null;

      await smsSyncController.downloadSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getRollingUpdates', () => {
    it('should fetch rolling updates for valid SMS token', async () => {
      const mockUpdates = [
        { id: 'update-1', sequence_number: 1, operation: 'create' },
        { id: 'update-2', sequence_number: 2, operation: 'update' }
      ];

      mockRollingUpdateService.getRollingUpdates.mockResolvedValue({
        updates: mockUpdates,
        last_sequence_number: 2,
        count: 2
      });

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRollingUpdateService.getRollingUpdates).toHaveBeenCalledWith(testChurchId, null, 100);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            updates: mockUpdates,
            last_sequence_number: 2,
            count: 2
          })
        })
      );
    });

    it('should support since_sequence parameter for incremental sync', async () => {
      const mockUpdates = [
        { id: 'update-3', sequence_number: 3, operation: 'create' }
      ];

      mockReq.query = { since_sequence: '2' };
      mockRollingUpdateService.getRollingUpdates.mockResolvedValue({
        updates: mockUpdates,
        last_sequence_number: 3,
        count: 1
      });

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRollingUpdateService.getRollingUpdates).toHaveBeenCalledWith(testChurchId, 2, 100);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should support limit parameter for batch size control', async () => {
      const mockUpdates = [
        { id: 'update-1', sequence_number: 1 }
      ];

      mockReq.query = { limit: '50' };
      mockRollingUpdateService.getRollingUpdates.mockResolvedValue({
        updates: mockUpdates,
        last_sequence_number: 1,
        count: 1
      });

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRollingUpdateService.getRollingUpdates).toHaveBeenCalledWith(testChurchId, null, 50);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should limit maximum batch size to 1000', async () => {
      mockReq.query = { limit: '2000' };
      mockRollingUpdateService.getRollingUpdates.mockResolvedValue({
        updates: [],
        last_sequence_number: 0,
        count: 0
      });

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRollingUpdateService.getRollingUpdates).toHaveBeenCalledWith(testChurchId, null, 1000);
    });

    it('should return empty array when no updates available', async () => {
      mockRollingUpdateService.getRollingUpdates.mockResolvedValue({
        updates: [],
        last_sequence_number: 0,
        count: 0
      });

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            updates: [],
            last_sequence_number: 0,
            count: 0
          })
        })
      );
    });

    it('should return 401 for invalid token', async () => {
      mockReq.user = null;

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required'
        })
      );
    });

    it('should return 403 for non-SMS scoped token', async () => {
      mockReq.user.scope = ['web'];

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for missing church_id in token', async () => {
      mockReq.user.churchId = null;

      await smsSyncController.getRollingUpdates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
