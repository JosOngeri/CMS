/**
 * SnapshotService.test.js
 *
 * Test suite for daily snapshot generation service.
 */

// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key';

// Mock hibp before importing security
jest.mock('hibp', () => ({
  breachedAccount: jest.fn().mockResolvedValue(false),
  pwnedPasswordRange: jest.fn().mockResolvedValue(0)
}));

const SnapshotService = require('../../services/SnapshotService');

// Mock the repository
const mockSnapshotRepository = {
  findByChurchAndDate: jest.fn(),
  createSnapshot: jest.fn(),
  getLatestSnapshot: jest.fn(),
  getSnapshotsSince: jest.fn(),
  deleteSnapshot: jest.fn(),
  deleteOldSnapshots: jest.fn()
};

jest.mock('../../repositories/SnapshotRepository', () => mockSnapshotRepository);

describe('SnapshotService', () => {
  let testChurchId;
  let mockDatabaseConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testChurchId = 'test-church-id';
    mockDatabaseConnection = {
      query: jest.fn()
    };

    // Set the mock repository on the service
    SnapshotService.setSnapshotRepository(mockSnapshotRepository);
  });

  describe('generateDailySnapshot', () => {
    it('should create a new snapshot when none exists for the date', async () => {
      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(null);
      mockSnapshotRepository.createSnapshot.mockResolvedValue({
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100
      });

      const snapshot = await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);

      expect(mockSnapshotRepository.findByChurchAndDate).toHaveBeenCalledWith(
        testChurchId,
        expect.any(String)
      );
      expect(mockSnapshotRepository.createSnapshot).toHaveBeenCalled();
      expect(snapshot).toHaveProperty('church_id', testChurchId);
      expect(snapshot).toHaveProperty('data_hash');
      expect(snapshot).toHaveProperty('compressed_data');
      expect(snapshot).toHaveProperty('file_size');
    });

    it('should return existing snapshot if one exists for the date', async () => {
      const existingSnapshot = {
        id: 'existing-snapshot-id',
        church_id: testChurchId,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_hash: 'existing-hash',
        compressed_data: Buffer.from('existing-compressed-data'),
        file_size: 150
      };

      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(existingSnapshot);

      const snapshot = await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);

      expect(mockSnapshotRepository.findByChurchAndDate).toHaveBeenCalledWith(
        testChurchId,
        expect.any(String)
      );
      expect(mockSnapshotRepository.createSnapshot).not.toHaveBeenCalled();
      expect(snapshot).toEqual(existingSnapshot);
    });

    it('should include metadata in snapshot data', async () => {
      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(null);
      mockSnapshotRepository.createSnapshot.mockResolvedValue({
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100
      });

      await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);

      const createCall = mockSnapshotRepository.createSnapshot.mock.calls[0];
      const snapshotData = createCall[0];

      expect(snapshotData).toHaveProperty('church_id', testChurchId);
      expect(snapshotData).toHaveProperty('snapshot_date');
      expect(snapshotData).toHaveProperty('data_hash');
      expect(snapshotData).toHaveProperty('compressed_data');
      expect(snapshotData).toHaveProperty('file_size');
    });

    it('should compress data to reduce size', async () => {
      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(null);
      mockSnapshotRepository.createSnapshot.mockResolvedValue({
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100
      });

      await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);

      const createCall = mockSnapshotRepository.createSnapshot.mock.calls[0];
      const snapshotData = createCall[0];

      expect(snapshotData.compressed_data).toBeInstanceOf(Buffer);
      expect(snapshotData.file_size).toBeGreaterThan(0);
    });

    it('should generate consistent hash for identical data', async () => {
      // Mock the current date to ensure consistent timestamps
      const fixedDate = new Date('2024-01-01T00:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedDate.toISOString());

      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(null);
      mockSnapshotRepository.createSnapshot.mockResolvedValue({
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100
      });

      await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);
      const firstHash = mockSnapshotRepository.createSnapshot.mock.calls[0][0].data_hash;

      await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);
      const secondHash = mockSnapshotRepository.createSnapshot.mock.calls[1][0].data_hash;

      expect(firstHash).toBe(secondHash);

      // Restore the original Date methods
      jest.restoreAllMocks();
    });

    it('should throw error on database connection failure', async () => {
      mockSnapshotRepository.findByChurchAndDate.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection)
      ).rejects.toThrow('Database connection failed');
    });

    it('should include all required entity types in snapshot', async () => {
      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(null);
      mockSnapshotRepository.createSnapshot.mockResolvedValue({
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_hash: 'test-hash',
        compressed_data: Buffer.from('compressed-data'),
        file_size: 100
      });

      await SnapshotService.generateDailySnapshot(testChurchId, mockDatabaseConnection);

      const createCall = mockSnapshotRepository.createSnapshot.mock.calls[0];
      const compressedData = createCall[0].compressed_data;
      
      // Decompress to check structure
      const zlib = require('zlib');
      const jsonData = zlib.gunzipSync(compressedData).toString();
      const data = JSON.parse(jsonData);

      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('contacts');
      expect(data).toHaveProperty('groups');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('templates');
    });
  });

  describe('getSnapshot', () => {
    it('should return null for non-existent snapshot', async () => {
      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(null);

      const snapshot = await SnapshotService.getSnapshot(testChurchId, '2024-01-01');

      expect(snapshot).toBeNull();
    });

    it('should return decompressed snapshot data', async () => {
      const testData = { test: 'data' };
      const jsonData = JSON.stringify(testData);
      const zlib = require('zlib');
      const compressedData = zlib.gzipSync(jsonData);

      const mockSnapshot = {
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: '2024-01-01',
        data_hash: 'test-hash',
        compressed_data: compressedData,
        file_size: compressedData.length
      };

      mockSnapshotRepository.findByChurchAndDate.mockResolvedValue(mockSnapshot);

      const snapshot = await SnapshotService.getSnapshot(testChurchId, '2024-01-01');

      expect(snapshot).toHaveProperty('data');
      expect(snapshot.data).toEqual(testData);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return null when no snapshots exist', async () => {
      mockSnapshotRepository.getLatestSnapshot.mockResolvedValue(null);

      const snapshot = await SnapshotService.getLatestSnapshot(testChurchId);

      expect(snapshot).toBeNull();
    });

    it('should return the latest snapshot with decompressed data', async () => {
      const testData = { test: 'latest-data' };
      const jsonData = JSON.stringify(testData);
      const zlib = require('zlib');
      const compressedData = zlib.gzipSync(jsonData);

      const mockSnapshot = {
        id: 'latest-snapshot-id',
        church_id: testChurchId,
        snapshot_date: '2024-01-01',
        data_hash: 'test-hash',
        compressed_data: compressedData,
        file_size: compressedData.length
      };

      mockSnapshotRepository.getLatestSnapshot.mockResolvedValue(mockSnapshot);

      const snapshot = await SnapshotService.getLatestSnapshot(testChurchId);

      expect(snapshot).toHaveProperty('data');
      expect(snapshot.data).toEqual(testData);
    });
  });

  describe('verifySnapshotIntegrity', () => {
    it('should return true for valid snapshot', async () => {
      const testData = { test: 'data' };
      const jsonData = JSON.stringify(testData);
      const crypto = require('crypto');
      const dataHash = crypto.createHash('sha256').update(jsonData).digest('hex');
      const zlib = require('zlib');
      const compressedData = zlib.gzipSync(jsonData);

      const mockSnapshot = {
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: '2024-01-01',
        data_hash: dataHash,
        compressed_data: compressedData,
        file_size: compressedData.length
      };

      const isValid = await SnapshotService.verifySnapshotIntegrity(mockSnapshot);

      expect(isValid).toBe(true);
    });

    it('should return false for corrupted snapshot', async () => {
      const mockSnapshot = {
        id: 'snapshot-id',
        church_id: testChurchId,
        snapshot_date: '2024-01-01',
        data_hash: 'wrong-hash',
        compressed_data: Buffer.from('corrupted-data'),
        file_size: 100
      };

      const isValid = await SnapshotService.verifySnapshotIntegrity(mockSnapshot);

      expect(isValid).toBe(false);
    });
  });
});
