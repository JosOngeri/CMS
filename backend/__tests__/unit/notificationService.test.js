/**
 * Unit Tests for Notification Service
 *
 * Targets the real service API (sendRealTimeNotification, createFromTemplate,
 * replaceVariables, createNotification, trackDelivery, batchNotifications,
 * createAggregatedNotification, getNotificationHistory, getDeliveryStats).
 * NOTE: no babel transform in this project — jest.mock is NOT hoisted, so
 * requires come after the mocks. The service starts a batch interval in its
 * constructor; cleanup() in afterAll prevents a worker-leak hang.
 */

jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() }
}));

jest.mock('../../config/logging', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

const { pool } = require('../../config/database');
const notificationService = require('../../services/notificationService');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    notificationService.cleanup();
  });

  describe('sendRealTimeNotification', () => {
    it('returns false when socket.io is not initialized', async () => {
      notificationService.setIo(null);
      const result = await notificationService.sendRealTimeNotification('user-1', { title: 'T' });
      expect(result).toBe(false);
    });

    it('emits to the user namespace when io is set', async () => {
      const emit = jest.fn();
      notificationService.setIo({ to: jest.fn(() => ({ emit })) });

      const result = await notificationService.sendRealTimeNotification('user-1', { title: 'T' });

      expect(result).toBe(true);
      expect(emit).toHaveBeenCalledWith('notification', { title: 'T' });
      notificationService.setIo(null);
    });
  });

  describe('replaceVariables', () => {
    it('substitutes template variables', () => {
      const result = notificationService.replaceVariables(
        'Hello {{name}}, your balance is {{amount}}',
        { name: 'John', amount: '1000' }
      );
      expect(result).toBe('Hello John, your balance is 1000');
    });

    it('leaves unknown variables untouched', () => {
      const result = notificationService.replaceVariables(
        'Hello {{name}}, your balance is {{amount}}',
        { name: 'John' }
      );
      expect(result).toBe('Hello John, your balance is {{amount}}');
    });

    it('returns null for null templates', () => {
      expect(notificationService.replaceVariables(null, { a: 1 })).toBeNull();
    });
  });

  describe('createNotification', () => {
    it('inserts a church-scoped notification row', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 'n1', title: 'T' }] });

      const result = await notificationService.createNotification(
        { user_id: 'u1', type_id: 't1', title: 'T', message: 'M' },
        'church-1'
      );

      expect(result).toEqual({ id: 'n1', title: 'T' });
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO notifications');
      expect(params).toContain('church-1');
    });

    it('rejects titles over 255 characters', async () => {
      await expect(
        notificationService.createNotification({ title: 'x'.repeat(256) }, 'church-1')
      ).rejects.toThrow('255');
    });
  });

  describe('trackDelivery', () => {
    it('upserts a delivery record', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await notificationService.trackDelivery('n1', 'delivered');

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe('n1');
      expect(params[1]).toBe('delivered');
    });

    it('swallows tracking errors (delivery tracking must not break sends)', async () => {
      pool.query.mockRejectedValue(new Error('DB down'));
      await expect(notificationService.trackDelivery('n1', 'failed')).resolves.toBeUndefined();
    });
  });

  describe('batchNotifications / createAggregatedNotification', () => {
    it('queues notifications per user', async () => {
      await notificationService.batchNotifications('user-9', [{ id: 'a' }, { id: 'b' }]);
      expect(notificationService.notificationQueue.get('user-9')).toHaveLength(2);
      notificationService.notificationQueue.clear();
    });

    it('creates a summary notification for a batch', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 'agg-1' }] });

      const result = await notificationService.createAggregatedNotification('user-9', [
        { id: 'a', type_id: 't1', church_id: 'church-1' },
        { id: 'b', type_id: 't2', church_id: 'church-1' }
      ]);

      expect(result).toEqual({ id: 'agg-1' });
      const [, params] = pool.query.mock.calls[0];
      expect(params[2]).toBe('2 New Notifications');
    });

    it('returns undefined for an empty batch', async () => {
      await expect(
        notificationService.createAggregatedNotification('user-9', [])
      ).resolves.toBeUndefined();
    });
  });

  describe('getNotificationHistory', () => {
    it('queries by user and clamps limit', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 'n1' }] });

      const rows = await notificationService.getNotificationHistory('user-1', { limit: 99999 });

      expect(rows).toEqual([{ id: 'n1' }]);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('LIMIT $');
      expect(params[params.length - 1]).toBe(1000); // clamped
      expect(sql).not.toContain('LIMIT 99999'); // never interpolated
    });
  });

  describe('getDeliveryStats', () => {
    it('scopes stats to the church', async () => {
      pool.query.mockResolvedValue({ rows: [{ total_sent: '5' }] });

      const stats = await notificationService.getDeliveryStats('church-1');

      expect(stats.total_sent).toBe('5');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('n.church_id = $1');
      expect(params[0]).toBe('church-1');
    });
  });
});
