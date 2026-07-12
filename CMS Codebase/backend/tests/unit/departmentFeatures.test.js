/**
 * Department Features Unit Tests
 * Tests for Department Features Repository and Controller
 */

const DepartmentFeaturesRepository = require('../../repositories/DepartmentFeaturesRepository');
const ResponseHandler = require('../../utils/ResponseHandler');

// Mock database
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('DepartmentFeaturesRepository', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = require('../../config/database').pool;
    jest.clearAllMocks();
  });

  describe('getAllFeatures', () => {
    it('should return all features', async () => {
      const mockFeatures = [
        { id: '1', slug: 'MEMBERSHIP_MANAGEMENT', name: 'Membership Management' },
        { id: '2', slug: 'TELEGRAM_SYNC', name: 'Telegram Integration' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockFeatures });

      const result = await DepartmentFeaturesRepository.getAllFeatures();

      expect(result).toEqual(mockFeatures);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should filter by church_id when provided', async () => {
      const churchId = 'test-church-id';
      mockPool.query.mockResolvedValue({ rows: [] });

      await DepartmentFeaturesRepository.getAllFeatures(churchId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        [churchId]
      );
    });
  });

  describe('getFeatureBySlug', () => {
    it('should return feature by slug', async () => {
      const mockFeature = { id: '1', slug: 'MEMBERSHIP_MANAGEMENT', name: 'Membership Management' };
      mockPool.query.mockResolvedValue({ rows: [mockFeature] });

      const result = await DepartmentFeaturesRepository.getFeatureBySlug('MEMBERSHIP_MANAGEMENT');

      expect(result).toEqual(mockFeature);
    });

    it('should return null when feature not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await DepartmentFeaturesRepository.getFeatureBySlug('NONEXISTENT');

      expect(result).toBeUndefined();
    });
  });

  describe('allocateFeatureToDepartment', () => {
    it('should allocate feature to department', async () => {
      const mockAllocation = { id: '1', department_id: 'dept-1', feature_id: 'feat-1' };
      mockPool.query.mockResolvedValue({ rows: [mockAllocation] });

      const result = await DepartmentFeaturesRepository.allocateFeatureToDepartment(
        'dept-1',
        'feat-1',
        {},
        'church-1'
      );

      expect(result).toEqual(mockAllocation);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO department_feature_settings'),
        expect.arrayContaining(['dept-1', 'feat-1', '{}', 'church-1'])
      );
    });
  });
});

describe('ResponseHandler', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should return success response', () => {
    ResponseHandler.success(mockRes, { data: 'test' }, 'Success message');

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: { data: 'test' },
      message: 'Success message',
      error: null,
      timestamp: expect.any(String)
    });
  });

  it('should return error response', () => {
    ResponseHandler.error(mockRes, 'Error message', 400);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Error message',
      data: null,
      message: 'Error message',
      timestamp: expect.any(String)
    });
  });
});
