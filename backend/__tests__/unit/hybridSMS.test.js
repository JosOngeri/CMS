/**
 * Unit Tests for Hybrid SMS Service
 *
 * Targets the real API: loadProviders, registerProvider, sendSMS
 * (JOSms small-batch vs bulk-provider large-batch routing),
 * sendViaBulkProvider failover, updateProviderBalance, getProviderStatus.
 * NOTE: no babel transform — jest.mock is NOT hoisted; requires come after.
 */

jest.mock('../../services/apiHub', () => ({
  registerIntegration: jest.fn(),
  callAPI: jest.fn(),
  getIntegrationStatus: jest.fn(() => ({ name: 'x', healthStatus: 'unknown' }))
}));

jest.mock('../../config/database', () => ({
  pool: { query: jest.fn(() => Promise.resolve({ rows: [] })) }
}));

jest.mock('../../config/logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Settings gates (sms_enabled / sms_notifications) are out of scope for
// routing tests — pretend both toggles are on.
jest.mock('../../helpers/churchSettings', () => ({
  getBool: jest.fn(() => Promise.resolve(true)),
  getSetting: jest.fn(() => Promise.resolve(null)),
  getInt: jest.fn((c, k, f) => Promise.resolve(f)),
  clearChurchCache: jest.fn()
}));

// Gateway presence is the new truthfulness gate — tests toggle it explicitly.
jest.mock('../../services/gatewayRegistry', () => ({
  isOnline: jest.fn(() => false),
  onlineCount: jest.fn(() => 0),
  getStatus: jest.fn(() => Promise.resolve({ online: false })),
  setIo: jest.fn(),
  register: jest.fn(),
  unregister: jest.fn(),
  heartbeat: jest.fn(),
}));

const apiHub = require('../../services/apiHub');
const { pool } = require('../../config/database');
const gatewayRegistry = require('../../services/gatewayRegistry');
const hybridSMS = require('../../services/hybridSMS');

const provider = (name, id) => ({
  id,
  name,
  api_key: `key-${name}`,
  api_url: `https://${name}.example.com`,
  sender_id: 'CHURCH',
  balance: 100,
  currency: 'KES',
  is_active: true
});

describe('Hybrid SMS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
    hybridSMS.providers.clear();
    hybridSMS.defaultProvider = null;
    hybridSMS.setIo(null);
  });

  describe('loadProviders', () => {
    it('registers each active provider and picks the first as default', async () => {
      pool.query.mockResolvedValue({ rows: [provider('A', 1), provider('B', 2)] });

      await hybridSMS.loadProviders();

      expect(apiHub.registerIntegration).toHaveBeenCalledTimes(2);
      expect(hybridSMS.defaultProvider).toBe('A');
      expect(hybridSMS.providers.size).toBe(2);
    });

    it('survives a missing sms_providers table (42P01)', async () => {
      const err = new Error('relation does not exist');
      err.code = '42P01';
      pool.query.mockRejectedValue(err);

      await expect(hybridSMS.loadProviders()).resolves.toBeUndefined();
    });
  });

  describe('sendSMS routing', () => {
    it('routes small batches to JOSms via websocket when a relay is online', async () => {
      const emit = jest.fn();
      hybridSMS.setIo({ to: jest.fn(() => ({ emit })) });
      gatewayRegistry.isOnline.mockReturnValue(true);

      const result = await hybridSMS.sendSMS({
        recipients: ['254700000001'],
        message: 'Hi',
        churchId: 'church-1'
      });

      expect(result.gateway).toBe('JOSms');
      expect(result.status).toBe('queued');
      expect(result.batchId).toBeTruthy();
      expect(emit).toHaveBeenCalledWith(
        'process_bulk',
        expect.objectContaining({ recipients: ['254700000001'] })
      );
    });

    it('reports offline instead of fake-queuing when no relay is connected', async () => {
      const emit = jest.fn();
      hybridSMS.setIo({ to: jest.fn(() => ({ emit })) });
      gatewayRegistry.isOnline.mockReturnValue(false);

      const result = await hybridSMS.sendSMS({
        recipients: ['254700000001'],
        message: 'Hi',
        churchId: 'church-1'
      });

      expect(result.gateway).toBe('JOSms');
      expect(result.status).toBe('offline');
      expect(result.success).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });

    it('fails over to bulk provider when the relay is offline', async () => {
      const emit = jest.fn();
      hybridSMS.setIo({ to: jest.fn(() => ({ emit })) });
      gatewayRegistry.isOnline.mockReturnValue(false);
      hybridSMS.registerProvider(provider('BulkCo', 1));
      hybridSMS.defaultProvider = 'BulkCo';
      apiHub.callAPI.mockResolvedValue({ success: true });

      const result = await hybridSMS.sendSMS({
        recipients: ['254700000001'],
        message: 'Hi',
        churchId: 'church-1'
      });

      expect(result.gateway).toBe('BulkCo');
      expect(result.status).toBe('sent');
      expect(emit).not.toHaveBeenCalled();
    });

    it('throws for small batches when socket.io is not initialized', async () => {
      await expect(
        hybridSMS.sendSMS({ recipients: ['254700000001'], message: 'Hi', churchId: 'c1' })
      ).rejects.toThrow('Socket.io not initialized');
    });

    it('routes large batches to the bulk provider', async () => {
      hybridSMS.registerProvider(provider('BulkCo', 1));
      hybridSMS.defaultProvider = 'BulkCo';
      apiHub.callAPI.mockResolvedValue({ success: true });

      const recipients = Array.from({ length: 500 }, (_, i) => `2547${String(i).padStart(6, '0')}`);
      const result = await hybridSMS.sendSMS({ recipients, message: 'Bulk', churchId: 'c1' });

      expect(result.gateway).toBe('BulkCo');
      expect(result.status).toBe('sent');
      expect(result.recipientCount).toBe(500);
      expect(apiHub.callAPI).toHaveBeenCalledWith(
        'BulkCo',
        '/send',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('sendViaBulkProvider failover', () => {
    it('falls back to the next provider when the primary fails', async () => {
      hybridSMS.registerProvider(provider('Primary', 1));
      hybridSMS.registerProvider(provider('Backup', 2));
      apiHub.callAPI
        .mockRejectedValueOnce(new Error('Primary down'))
        .mockResolvedValueOnce({ success: true });

      const result = await hybridSMS.sendViaBulkProvider({
        recipients: ['254700000001'],
        message: 'Hi'
      }, 'Primary');

      expect(result.gateway).toBe('Backup');
      expect(result.success).toBe(true);
      expect(apiHub.callAPI).toHaveBeenCalledTimes(2);
    });

    it('throws when all providers fail', async () => {
      hybridSMS.registerProvider(provider('Only', 1));
      apiHub.callAPI.mockRejectedValue(new Error('down'));

      await expect(
        hybridSMS.sendViaBulkProvider({ recipients: ['1'], message: 'x' }, 'Only')
      ).rejects.toThrow('no fallback providers available');
    });

    it('throws for an unknown provider', async () => {
      await expect(
        hybridSMS.sendViaBulkProvider({ recipients: ['1'], message: 'x' }, 'ghost')
      ).rejects.toThrow('SMS provider not found');
    });

    it('never sends through another church\'s provider', async () => {
      // Church A's provider row must not serve Church B's traffic.
      hybridSMS.registerProvider({ ...provider('ChurchACo', 1), church_id: 'church-a' });
      hybridSMS.registerProvider({ ...provider('Shared', 2), church_id: null });
      apiHub.callAPI.mockResolvedValue({ success: true });

      // Church B cannot name Church A's provider — fails loudly.
      await expect(
        hybridSMS.sendViaBulkProvider(
          { recipients: ['1'], message: 'x', churchId: 'church-b' },
          'ChurchACo'
        )
      ).rejects.toThrow('SMS provider not found');

      // Church B with no preference uses the shared provider.
      const result = await hybridSMS.sendViaBulkProvider(
        { recipients: ['1'], message: 'x', churchId: 'church-b' }
      );
      expect(result.gateway).toBe('Shared');

      // Church A can use its own provider by name.
      const r2 = await hybridSMS.sendViaBulkProvider(
        { recipients: ['1'], message: 'x', churchId: 'church-a' },
        'ChurchACo'
      );
      expect(r2.gateway).toBe('ChurchACo');
    });

    it('persists an updated balance returned by the provider', async () => {
      hybridSMS.registerProvider(provider('BulkCo', 7));
      apiHub.callAPI.mockResolvedValue({ success: true, balance: 42 });

      await hybridSMS.sendViaBulkProvider({ recipients: ['1'], message: 'x' }, 'BulkCo');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET balance = $1'),
        [42, 7]
      );
    });
  });

  describe('provider status', () => {
    it('combines apiHub status with the DB balance', async () => {
      hybridSMS.registerProvider(provider('BulkCo', 7));
      apiHub.getIntegrationStatus.mockReturnValue({ name: 'BulkCo', healthStatus: 'healthy' });
      pool.query.mockResolvedValue({ rows: [{ balance: 250 }] });

      const status = await hybridSMS.getProviderStatus('BulkCo');

      expect(status.healthStatus).toBe('healthy');
      expect(status.balance).toBe(250);
      expect(status.currency).toBe('KES');
    });

    it('returns not_found for unknown providers', async () => {
      expect(await hybridSMS.getProviderStatus('ghost')).toEqual({ status: 'not_found' });
    });
  });
});
