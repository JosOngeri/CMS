/**
 * Unit Tests for Notification Service
 */

const notificationService = require('../../services/notificationService');

// Mock dependencies
jest.mock('../../services/redisCache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));

jest.mock('socket.io', () => ({
  emit: jest.fn()
}));

const redisCache = require('../../services/redisCache');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification to user', async () => {
      redisCache.get.mockResolvedValue(null);
      redisCache.set.mockResolvedValue(true);

      const result = await notificationService.sendNotification('user-1', 'test-notification', {
        title: 'Test',
        message: 'Test message'
      });

      expect(result).toHaveProperty('success', true);
      expect(redisCache.set).toHaveBeenCalled();
    });

    it('should use cached template if available', async () => {
      const cachedTemplate = {
        subject: 'Cached Subject',
        body: 'Cached Body with {{name}}'
      };
      redisCache.get.mockResolvedValue(JSON.stringify(cachedTemplate));

      const result = await notificationService.sendNotification('user-1', 'test-notification', {
        name: 'John'
      });

      expect(redisCache.get).toHaveBeenCalled();
      expect(result).toHaveProperty('success', true);
    });

    it('should batch notifications for multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      redisCache.get.mockResolvedValue(null);
      redisCache.set.mockResolvedValue(true);

      const result = await notificationService.sendBatchNotifications(userIds, 'test-notification', {
        title: 'Test'
      });

      expect(result).toHaveProperty('success', true);
      expect(result.sentCount).toBe(3);
    });
  });

  describe('template management', () => {
    it('should create notification template', async () => {
      const template = {
        key: 'welcome-notification',
        subject: 'Welcome {{name}}',
        body: 'Hello {{name}}, welcome to our church!'
      };

      const result = await notificationService.createTemplate(template);

      expect(result).toHaveProperty('success', true);
      expect(redisCache.set).toHaveBeenCalled();
    });

    it('should substitute template variables', () => {
      const template = 'Hello {{name}}, your balance is {{amount}}';
      const variables = { name: 'John', amount: '1000' };

      const result = notificationService.substituteVariables(template, variables);

      expect(result).toBe('Hello John, your balance is 1000');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, your balance is {{amount}}';
      const variables = { name: 'John' };

      const result = notificationService.substituteVariables(template, variables);

      expect(result).toBe('Hello John, your balance is {{amount}}');
    });
  });

  describe('notification tracking', () => {
    it('should track notification delivery', async () => {
      const result = await notificationService.trackDelivery('notification-id-1', 'delivered');

      expect(result).toHaveProperty('success', true);
    });

    it('should get notification history for user', async () => {
      const result = await notificationService.getUserNotificationHistory('user-1');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('notifications');
      expect(Array.isArray(result.notifications)).toBe(true);
    });
  });

  describe('notification aggregation', () => {
    it('should aggregate similar notifications', async () => {
      const notifications = [
        { type: 'payment', count: 1 },
        { type: 'payment', count: 1 },
        { type: 'announcement', count: 1 }
      ];

      const result = notificationService.aggregateNotifications(notifications);

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(2);
    });

    it('should respect aggregation time window', async () => {
      const result = await notificationService.getAggregatedNotifications('user-1', 300); // 5 minutes

      expect(result).toHaveProperty('success', true);
    });
  });
});
