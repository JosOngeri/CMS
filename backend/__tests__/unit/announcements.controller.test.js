/**
 * Unit Tests for Announcement Controller
 *
 * The controller delegates persistence to AnnouncementsRepository and uses
 * BaseController's sendSuccess/sendError helpers — the mocks below target
 * those boundaries (this project has no babel transform, so jest.mock is NOT
 * hoisted: every require must come after its jest.mock call).
 */

jest.mock('../../repositories/AnnouncementsRepository', () => ({
  createAnnouncement: jest.fn(),
  getWithAuthorDetails: jest.fn(),
  getRecent: jest.fn(),
  checkAnnouncementAccess: jest.fn(),
  updateAnnouncement: jest.fn(),
  deleteAnnouncement: jest.fn(),
  getPaginatedAnnouncements: jest.fn(),
  getAnnouncementCount: jest.fn()
}));

jest.mock('express-validator', () => ({
  body: jest.fn(() => ({ run: jest.fn() })),
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

const AnnouncementsRepository = require('../../repositories/AnnouncementsRepository');
const { validationResult } = require('express-validator');
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
      church_id: 'church-1',
      user: { id: 'test-user-id', church_id: 'church-1', roles: ['Super Admin'] }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
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

      AnnouncementsRepository.createAnnouncement.mockResolvedValue({ id: 'announcement-id' });
      AnnouncementsRepository.getWithAuthorDetails.mockResolvedValue({
        id: 'announcement-id',
        title: 'Test Announcement'
      });

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Announcement created successfully'
        })
      );
      expect(AnnouncementsRepository.createAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Announcement' }),
        'church-1'
      );
    });

    it('should handle validation errors', async () => {
      mockReq.body = {}; // Missing required fields
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Title is required' }]
      });

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(AnnouncementsRepository.createAnnouncement).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockReq.body = { title: 'Test Announcement', content: 'Test content' };
      AnnouncementsRepository.createAnnouncement.mockRejectedValue(new Error('Database error'));

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getAll', () => {
    it('should get recent announcements for the church', async () => {
      AnnouncementsRepository.getRecent.mockResolvedValue([{ id: 'a1' }]);

      await controller.getAll(mockReq, mockRes);

      expect(AnnouncementsRepository.getRecent).toHaveBeenCalledWith('church-1', 20);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ announcements: expect.any(Array) })
        })
      );
    });
  });

  describe('getById', () => {
    it('should get announcement by ID', async () => {
      mockReq.params = { id: 'announcement-id' };
      AnnouncementsRepository.getWithAuthorDetails.mockResolvedValue({ id: 'announcement-id' });
      AnnouncementsRepository.checkAnnouncementAccess.mockResolvedValue(true);

      await controller.getById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ announcement: expect.any(Object) })
        })
      );
    });

    it('should return 404 if announcement not found', async () => {
      mockReq.params = { id: 'non-existent-id' };
      AnnouncementsRepository.getWithAuthorDetails.mockResolvedValue(null);

      await controller.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when access check fails', async () => {
      mockReq.params = { id: 'announcement-id' };
      AnnouncementsRepository.getWithAuthorDetails.mockResolvedValue({ id: 'announcement-id' });
      AnnouncementsRepository.checkAnnouncementAccess.mockResolvedValue(false);

      await controller.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('update', () => {
    it('should update announcement successfully', async () => {
      mockReq.params = { id: 'announcement-id' };
      mockReq.body = { title: 'Updated Title' };
      AnnouncementsRepository.getWithAuthorDetails.mockResolvedValue({
        id: 'announcement-id',
        author_id: 'test-user-id'
      });
      AnnouncementsRepository.updateAnnouncement.mockResolvedValue({
        id: 'announcement-id',
        title: 'Updated Title'
      });

      await controller.update(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Announcement updated successfully' })
      );
    });

    it('should return 403 if user lacks permission', async () => {
      mockReq.params = { id: 'announcement-id' };
      mockReq.body = { title: 'Updated Title' };
      mockReq.user = { id: 'other-user-id', church_id: 'church-1', roles: [] };
      AnnouncementsRepository.getWithAuthorDetails.mockResolvedValue({
        id: 'announcement-id',
        author_id: 'different-user-id'
      });

      await controller.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(AnnouncementsRepository.updateAnnouncement).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete announcement successfully', async () => {
      mockReq.params = { id: 'announcement-id' };
      AnnouncementsRepository.deleteAnnouncement.mockResolvedValue(true);

      await controller.delete(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Announcement deleted successfully' })
      );
    });

    it('should return 404 if announcement not found', async () => {
      mockReq.params = { id: 'non-existent-id' };
      AnnouncementsRepository.deleteAnnouncement.mockResolvedValue(false);

      await controller.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for non-admin users', async () => {
      mockReq.params = { id: 'announcement-id' };
      mockReq.user = { id: 'member-id', church_id: 'church-1', roles: ['Member'] };

      await controller.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(AnnouncementsRepository.deleteAnnouncement).not.toHaveBeenCalled();
    });
  });

  describe('getPublic', () => {
    it('should get public announcements without authentication', async () => {
      mockReq.query = { page: 1, limit: 10 };
      mockReq.user = undefined;
      AnnouncementsRepository.getPaginatedAnnouncements.mockResolvedValue([{ id: 'a1' }]);
      AnnouncementsRepository.getAnnouncementCount.mockResolvedValue(1);

      await controller.getPublic(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            announcements: expect.any(Array),
            pagination: expect.any(Object)
          })
        })
      );
    });
  });
});
