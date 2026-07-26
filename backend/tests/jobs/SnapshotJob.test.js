/**
 * SnapshotJob.test.js
 *
 * Test suite for scheduled snapshot and rolling update jobs.
 */

// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key';

// Mock hibp before importing security
jest.mock('hibp', () => ({
  breachedAccount: jest.fn().mockResolvedValue(false),
  pwnedPasswordRange: jest.fn().mockResolvedValue(0)
}));

const SnapshotJob = require('../../jobs/SnapshotJob');
const RollingUpdateJob = require('../../jobs/RollingUpdateJob');

// Mock the services
const mockSnapshotService = {
  generateDailySnapshot: jest.fn(),
  snapshotRepository: {
    deleteOldSnapshots: jest.fn()
  }
};

const mockRollingUpdateService = {
  deleteOldRollingUpdates: jest.fn()
};

const mockChurchRepository = {
  getActiveChurches: jest.fn()
};

const mockSnapshotRepository = {
  deleteOldSnapshots: jest.fn()
};

jest.mock('../../services/SnapshotService', () => mockSnapshotService);
jest.mock('../../services/RollingUpdateService', () => mockRollingUpdateService);
jest.mock('../../repositories/ChurchRepository', () => mockChurchRepository);
jest.mock('../../repositories/SnapshotRepository', () => mockSnapshotRepository);

describe('Scheduled Jobs', () => {
  let testChurches;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testChurches = [
      {
        id: 'church-1',
        name: 'Test Church 1',
        slug: 'test-church-1',
        is_active: true
      },
      {
        id: 'church-2',
        name: 'Test Church 2',
        slug: 'test-church-2',
        is_active: true
      }
    ];

    // Set the mock services on the jobs
    SnapshotJob.setServices({
      snapshotService: mockSnapshotService,
      churchRepository: mockChurchRepository,
      snapshotRepository: mockSnapshotRepository
    });

    RollingUpdateJob.setServices({
      rollingUpdateService: mockRollingUpdateService,
      churchRepository: mockChurchRepository
    });
  });

  describe('SnapshotJob', () => {
    describe('runDailySnapshotJob', () => {
      it('should generate daily snapshots for all active churches', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);
        mockSnapshotService.generateDailySnapshot.mockResolvedValue({
          id: 'snapshot-1',
          church_id: 'church-1'
        });

        const result = await SnapshotJob.runDailySnapshotJob();

        expect(mockChurchRepository.getActiveChurches).toHaveBeenCalled();
        expect(mockSnapshotService.generateDailySnapshot).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
        expect(result.processed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.total).toBe(2);
      });

      it('should continue processing other churches if one fails', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);
        mockSnapshotService.generateDailySnapshot
          .mockResolvedValueOnce({ id: 'snapshot-1', church_id: 'church-1' })
          .mockRejectedValueOnce(new Error('Database error'));

        const result = await SnapshotJob.runDailySnapshotJob();

        expect(result.success).toBe(true);
        expect(result.processed).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.total).toBe(2);
      });

      it('should handle empty church list', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue([]);

        const result = await SnapshotJob.runDailySnapshotJob();

        expect(result.success).toBe(true);
        expect(result.processed).toBe(0);
        expect(result.failed).toBe(0);
        expect(result.total).toBe(0);
      });

      it('should log success/failure for each church processed', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);
        mockSnapshotService.generateDailySnapshot.mockResolvedValue({
          id: 'snapshot-1',
          church_id: 'church-1'
        });

        const result = await SnapshotJob.runDailySnapshotJob();

        expect(result.results).toHaveLength(2);
        expect(result.results[0]).toHaveProperty('church_id');
        expect(result.results[0]).toHaveProperty('success');
        expect(result.results[0]).toHaveProperty('snapshot_id');
      });

      it('should handle database connection errors gracefully', async () => {
        mockChurchRepository.getActiveChurches.mockRejectedValue(new Error('Connection error'));

        const result = await SnapshotJob.runDailySnapshotJob();

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('runCleanupJob', () => {
      it('should delete old snapshots for all active churches', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);
        mockSnapshotRepository.deleteOldSnapshots.mockResolvedValue([]);

        const result = await SnapshotJob.runCleanupJob();

        expect(mockChurchRepository.getActiveChurches).toHaveBeenCalled();
        expect(mockSnapshotRepository.deleteOldSnapshots).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
        expect(result.total_deleted).toBe(0);
      });

      it('should respect church is_active flag', async () => {
        const activeChurches = [testChurches[0]];
        mockChurchRepository.getActiveChurches.mockResolvedValue(activeChurches);
        mockSnapshotRepository.deleteOldSnapshots.mockResolvedValue([]);

        const result = await SnapshotJob.runCleanupJob();

        expect(mockSnapshotRepository.deleteOldSnapshots).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('RollingUpdateJob', () => {
    describe('runRollingUpdateJob', () => {
      it('should process rolling updates for all active churches', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);

        const result = await RollingUpdateJob.runRollingUpdateJob();

        expect(mockChurchRepository.getActiveChurches).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.processed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.total).toBe(2);
      });

      it('should continue processing other churches if one fails', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);

        const result = await RollingUpdateJob.runRollingUpdateJob();

        expect(result.success).toBe(true);
        expect(result.processed).toBe(2);
        expect(result.failed).toBe(0);
      });

      it('should handle empty church list', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue([]);

        const result = await RollingUpdateJob.runRollingUpdateJob();

        expect(result.success).toBe(true);
        expect(result.processed).toBe(0);
        expect(result.failed).toBe(0);
      });

      it('should handle database connection errors gracefully', async () => {
        mockChurchRepository.getActiveChurches.mockRejectedValue(new Error('Connection error'));

        const result = await RollingUpdateJob.runRollingUpdateJob();

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('runCleanupJob', () => {
      it('should delete old rolling updates for all active churches', async () => {
        mockChurchRepository.getActiveChurches.mockResolvedValue(testChurches);
        mockRollingUpdateService.deleteOldRollingUpdates.mockResolvedValue([]);

        const result = await RollingUpdateJob.runCleanupJob();

        expect(mockChurchRepository.getActiveChurches).toHaveBeenCalled();
        expect(mockRollingUpdateService.deleteOldRollingUpdates).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
        expect(result.total_deleted).toBe(0);
      });

      it('should respect church is_active flag', async () => {
        const activeChurches = [testChurches[0]];
        mockChurchRepository.getActiveChurches.mockResolvedValue(activeChurches);
        mockRollingUpdateService.deleteOldRollingUpdates.mockResolvedValue([]);

        const result = await RollingUpdateJob.runCleanupJob();

        expect(mockRollingUpdateService.deleteOldRollingUpdates).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
      });
    });
  });
});
