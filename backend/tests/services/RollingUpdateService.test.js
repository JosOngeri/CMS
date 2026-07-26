/**
 * RollingUpdateService.test.js
 *
 * Test suite for rolling update capture service.
 */

// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key';

// Mock hibp before importing security
jest.mock('hibp', () => ({
  breachedAccount: jest.fn().mockResolvedValue(false),
  pwnedPasswordRange: jest.fn().mockResolvedValue(0)
}));

const RollingUpdateService = require('../../services/RollingUpdateService');

// Mock the repository
const mockSnapshotRepository = {
  createRollingUpdate: jest.fn(),
  getRollingUpdates: jest.fn(),
  getNextSequenceNumber: jest.fn(),
  deleteOldRollingUpdates: jest.fn()
};

jest.mock('../../repositories/SnapshotRepository', () => mockSnapshotRepository);

describe('RollingUpdateService', () => {
  let testChurchId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testChurchId = 'test-church-id';

    // Set the mock repository on the service
    RollingUpdateService.setSnapshotRepository(mockSnapshotRepository);
  });

  describe('captureUpdate', () => {
    it('should capture contact creation with correct operation and entity type', async () => {
      const contactData = {
        id: 'contact-1',
        name: 'John Doe',
        phone: '+1234567890'
      };

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-1',
        church_id: testChurchId,
        sequence_number: 1,
        operation: 'create',
        entity_type: 'contact'
      });

      const update = await RollingUpdateService.captureUpdate(
        testChurchId,
        'create',
        'contact',
        contactData.id,
        contactData
      );

      expect(mockSnapshotRepository.getNextSequenceNumber).toHaveBeenCalledWith(testChurchId);
      expect(mockSnapshotRepository.createRollingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          church_id: testChurchId,
          operation: 'create',
          entity_type: 'contact',
          entity_id: contactData.id,
          data: contactData,
          sequence_number: 1
        })
      );
      expect(update.operation).toBe('create');
      expect(update.entity_type).toBe('contact');
    });

    it('should capture contact update with delta data', async () => {
      const contactData = {
        id: 'contact-1',
        name: 'John Updated',
        phone: '+1234567890'
      };

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(2);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-2',
        church_id: testChurchId,
        sequence_number: 2,
        operation: 'update',
        entity_type: 'contact'
      });

      const update = await RollingUpdateService.captureUpdate(
        testChurchId,
        'update',
        'contact',
        contactData.id,
        contactData
      );

      expect(mockSnapshotRepository.createRollingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          entity_type: 'contact',
          data: contactData
        })
      );
      expect(update.operation).toBe('update');
    });

    it('should capture contact deletion with minimal metadata', async () => {
      const contactId = 'contact-1';

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(3);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-3',
        church_id: testChurchId,
        sequence_number: 3,
        operation: 'delete',
        entity_type: 'contact'
      });

      const update = await RollingUpdateService.captureUpdate(
        testChurchId,
        'delete',
        'contact',
        contactId,
        null
      );

      expect(mockSnapshotRepository.createRollingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          entity_type: 'contact',
          entity_id: contactId,
          data: null
        })
      );
      expect(update.operation).toBe('delete');
    });

    it('should capture group operations with proper entity type', async () => {
      const groupData = {
        id: 'group-1',
        name: 'Test Group'
      };

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(4);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-4',
        church_id: testChurchId,
        sequence_number: 4,
        operation: 'create',
        entity_type: 'group'
      });

      const update = await RollingUpdateService.captureUpdate(
        testChurchId,
        'create',
        'group',
        groupData.id,
        groupData
      );

      expect(update.entity_type).toBe('group');
    });

    it('should capture message operations with proper entity type', async () => {
      const messageData = {
        id: 'message-1',
        content: 'Test message'
      };

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(5);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-5',
        church_id: testChurchId,
        sequence_number: 5,
        operation: 'create',
        entity_type: 'message'
      });

      const update = await RollingUpdateService.captureUpdate(
        testChurchId,
        'create',
        'message',
        messageData.id,
        messageData
      );

      expect(update.entity_type).toBe('message');
    });

    it('should capture template operations with proper entity type', async () => {
      const templateData = {
        id: 'template-1',
        name: 'Test Template'
      };

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(6);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-6',
        church_id: testChurchId,
        sequence_number: 6,
        operation: 'create',
        entity_type: 'template'
      });

      const update = await RollingUpdateService.captureUpdate(
        testChurchId,
        'create',
        'template',
        templateData.id,
        templateData
      );

      expect(update.entity_type).toBe('template');
    });

    it('should generate monotonically increasing sequence numbers', async () => {
      mockSnapshotRepository.getNextSequenceNumber
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-1',
        church_id: testChurchId,
        sequence_number: 1
      });

      await RollingUpdateService.captureUpdate(testChurchId, 'create', 'contact', 'contact-1', {});
      const firstSeq = mockSnapshotRepository.createRollingUpdate.mock.calls[0][0].sequence_number;

      await RollingUpdateService.captureUpdate(testChurchId, 'create', 'contact', 'contact-2', {});
      const secondSeq = mockSnapshotRepository.createRollingUpdate.mock.calls[1][0].sequence_number;

      await RollingUpdateService.captureUpdate(testChurchId, 'create', 'contact', 'contact-3', {});
      const thirdSeq = mockSnapshotRepository.createRollingUpdate.mock.calls[2][0].sequence_number;

      expect(firstSeq).toBe(1);
      expect(secondSeq).toBe(2);
      expect(thirdSeq).toBe(3);
    });

    it('should include complete entity data in JSON format for updates', async () => {
      const contactData = {
        id: 'contact-1',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        group_id: 'group-1'
      };

      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({
        id: 'update-1',
        church_id: testChurchId,
        sequence_number: 1
      });

      await RollingUpdateService.captureUpdate(
        testChurchId,
        'update',
        'contact',
        contactData.id,
        contactData
      );

      const createCall = mockSnapshotRepository.createRollingUpdate.mock.calls[0];
      const data = createCall[0].data;

      expect(data).toEqual(contactData);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('phone');
    });

    it('should throw error for invalid operation type', async () => {
      await expect(
        RollingUpdateService.captureUpdate(testChurchId, 'invalid', 'contact', 'contact-1', {})
      ).rejects.toThrow('Invalid operation');
    });

    it('should throw error for invalid entity type', async () => {
      await expect(
        RollingUpdateService.captureUpdate(testChurchId, 'create', 'invalid', 'contact-1', {})
      ).rejects.toThrow('Invalid entity type');
    });

    it('should throw error when entity data is missing for create operation', async () => {
      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);

      await expect(
        RollingUpdateService.captureUpdate(testChurchId, 'create', 'contact', 'contact-1', null)
      ).rejects.toThrow('Entity data is required');
    });

    it('should throw error when entity data is missing for update operation', async () => {
      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);

      await expect(
        RollingUpdateService.captureUpdate(testChurchId, 'update', 'contact', 'contact-1', null)
      ).rejects.toThrow('Entity data is required');
    });
  });

  describe('getRollingUpdates', () => {
    it('should return rolling updates for church', async () => {
      const mockUpdates = [
        { id: 'update-1', sequence_number: 1, operation: 'create' },
        { id: 'update-2', sequence_number: 2, operation: 'update' }
      ];

      mockSnapshotRepository.getRollingUpdates.mockResolvedValue(mockUpdates);

      const result = await RollingUpdateService.getRollingUpdates(testChurchId);

      expect(mockSnapshotRepository.getRollingUpdates).toHaveBeenCalledWith(testChurchId, null, 100);
      expect(result.updates).toEqual(mockUpdates);
      expect(result.last_sequence_number).toBe(2);
      expect(result.count).toBe(2);
    });

    it('should support since_sequence parameter for incremental sync', async () => {
      const mockUpdates = [
        { id: 'update-3', sequence_number: 3, operation: 'create' }
      ];

      mockSnapshotRepository.getRollingUpdates.mockResolvedValue(mockUpdates);

      const result = await RollingUpdateService.getRollingUpdates(testChurchId, 2);

      expect(mockSnapshotRepository.getRollingUpdates).toHaveBeenCalledWith(testChurchId, 2, 100);
      expect(result.updates).toEqual(mockUpdates);
    });

    it('should support limit parameter for batch size control', async () => {
      const mockUpdates = [
        { id: 'update-1', sequence_number: 1 }
      ];

      mockSnapshotRepository.getRollingUpdates.mockResolvedValue(mockUpdates);

      const result = await RollingUpdateService.getRollingUpdates(testChurchId, null, 50);

      expect(mockSnapshotRepository.getRollingUpdates).toHaveBeenCalledWith(testChurchId, null, 50);
      expect(result.updates).toEqual(mockUpdates);
    });

    it('should return empty array when no updates available', async () => {
      mockSnapshotRepository.getRollingUpdates.mockResolvedValue([]);

      const result = await RollingUpdateService.getRollingUpdates(testChurchId);

      expect(result.updates).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should return last_sequence_number for pagination', async () => {
      const mockUpdates = [
        { id: 'update-1', sequence_number: 10 },
        { id: 'update-2', sequence_number: 11 },
        { id: 'update-3', sequence_number: 12 }
      ];

      mockSnapshotRepository.getRollingUpdates.mockResolvedValue(mockUpdates);

      const result = await RollingUpdateService.getRollingUpdates(testChurchId);

      expect(result.last_sequence_number).toBe(12);
    });
  });

  describe('Convenience methods', () => {
    it('should provide captureContactCreate method', async () => {
      const contactData = { id: 'contact-1', name: 'John Doe' };
      
      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({});

      await RollingUpdateService.captureContactCreate(testChurchId, contactData);

      expect(mockSnapshotRepository.createRollingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          entity_type: 'contact',
          entity_id: contactData.id,
          data: contactData
        })
      );
    });

    it('should provide captureContactUpdate method', async () => {
      const contactData = { id: 'contact-1', name: 'John Updated' };
      
      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({});

      await RollingUpdateService.captureContactUpdate(testChurchId, contactData.id, contactData);

      expect(mockSnapshotRepository.createRollingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          entity_type: 'contact',
          entity_id: contactData.id,
          data: contactData
        })
      );
    });

    it('should provide captureContactDelete method', async () => {
      const contactId = 'contact-1';
      
      mockSnapshotRepository.getNextSequenceNumber.mockResolvedValue(1);
      mockSnapshotRepository.createRollingUpdate.mockResolvedValue({});

      await RollingUpdateService.captureContactDelete(testChurchId, contactId);

      expect(mockSnapshotRepository.createRollingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          entity_type: 'contact',
          entity_id: contactId,
          data: null
        })
      );
    });
  });
});
