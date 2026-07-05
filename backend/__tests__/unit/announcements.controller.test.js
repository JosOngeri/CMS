/**
 * Unit Tests for Announcement Controller
 */

const request = require('supertest');
const { pool } = require('../../config/database');

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

const AnnouncementController = require('../../controllers/announcements.controller');

describe('AnnouncementController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new AnnouncementController();
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'test-user-id', roles: ['Super Admin'] }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an announcement successfully', async () => {
      mockReq.body = {
        title: 'Test Announcement',
        content: 'Test content',
        announcement_type: 'general',
        priority: 'normal',
        is_public: true
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'announcement-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'announcement-id', title: 'Test Announcement' }] });

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Announcement created successfully'
        })
      );
    });

    it('should handle validation errors', async () => {
      mockReq.body = {}; // Missing required fields

      // Mock validationResult to return errors
      const { validationResult } = require('express-validator');
      jest.mock('express-validator', () => ({
        validationResult: jest.fn(() => ({
          isEmpty: () => false,
          array: () => [{ msg: 'Title is required' }]
        }))
      }));

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
    });

    it('should handle database errors', async () => {
      mockReq.body = {
        title: 'Test Announcement',
        content: 'Test content'
      };

      pool.query.mockRejectedValue(new Error('Database error'));

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error'
        })
      );
    });
  });

  describe('getAll', () => {
    it('should get all announcements with pagination', async () => {
      mockReq.query = { page: 1, limit: 20 };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await controller.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          announcements: expect.any(Array),
          pagination: expect.any(Object)
        })
      );
    });

    it('should filter by department_id', async () => {
      mockReq.query = { page: 1, limit: 20, department_id: 'dept-id' };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await controller.getAll(mockReq, mockRes);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('department_id = $'),
        expect.arrayContaining(expect.any(String))
      );
    });
  });

  describe('getById', () => {
    it('should get announcement by ID', async () => {
      mockReq.params = { id: 'announcement-id' };

      pool.query.mockResolvedValue({
        rows: [{ id: 'announcement-id', title: 'Test Announcement' }]
      });

      await controller.getById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          announcement: expect.any(Object)
        })
      );
    });

    it('should return 404 if announcement not found', async () => {
      mockReq.params = { id: 'non-existent-id' };

      pool.query.mockResolvedValue({ rows: [] });

      await controller.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Announcement not found'
        })
      );
    });
  });

  describe('update', () => {
    it('should update announcement successfully', async () => {
      mockReq.params = { id: 'announcement-id' };
      mockReq.body = { title: 'Updated Title' };

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'announcement-id', author_id: 'test-user-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'announcement-id', title: 'Updated Title' }] });

      await controller.update(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Announcement updated successfully'
        })
      );
    });

    it('should return 403 if user lacks permission', async () => {
      mockReq.params = { id: 'announcement-id' };
      mockReq.body = { title: 'Updated Title' };
      mockReq.user = { id: 'other-user-id', roles: [] };

      pool.query.mockResolvedValue({
        rows: [{ id: 'announcement-id', author_id: 'different-user-id' }]
      });

      await controller.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('delete', () => {
    it('should delete announcement successfully', async () => {
      mockReq.params = { id: 'announcement-id' };

      pool.query
        .mockResolvedValueOnce({ rows: [{ can_delete: true }] })
        .mockResolvedValueOnce({});

      await controller.delete(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Announcement deleted successfully'
        })
      );
    });

    it('should return 404 if announcement not found', async () => {
      mockReq.params = { id: 'non-existent-id' };

      pool.query.mockResolvedValue({ rows: [] });

      await controller.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getPublic', () => {
    it('should get public announcements without authentication', async () => {
      mockReq.query = { page: 1, limit: 10 };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await controller.getPublic(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          announcements: expect.any(Array)
        })
      );
    });
  });
});
