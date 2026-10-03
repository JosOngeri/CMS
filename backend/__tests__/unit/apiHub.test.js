/**
 * Unit Tests for API Hub Service
 *
 * Targets the real API: registerIntegration, callAPI (retry + failover),
 * checkHealth, getIntegrationStatus, getAllIntegrationStatuses.
 * axios is invoked as a function (axios({...})) so the mock is a jest.fn.
 * retryConfig is shrunk in beforeEach so retry tests don't sleep for real.
 */

jest.mock('axios', () => jest.fn());

jest.mock('../../config/logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const axios = require('axios');
const apiHub = require('../../services/apiHub');

describe('API Hub Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiHub.integrations.clear();
    apiHub.retryConfig = { maxRetries: 2, retryDelay: 1, backoffMultiplier: 1 };
  });

  describe('registerIntegration / getIntegrationStatus', () => {
    it('registers an integration with unknown health', () => {
      apiHub.registerIntegration('sms', { baseUrl: 'https://api.example.com' });

      const status = apiHub.getIntegrationStatus('sms');
      expect(status.name).toBe('sms');
      expect(status.healthStatus).toBe('unknown');
      expect(status.hasFailover).toBe(false);
    });

    it('reports not_found for unregistered integrations', () => {
      expect(apiHub.getIntegrationStatus('nope')).toEqual({ status: 'not_found' });
    });
  });

  describe('callAPI', () => {
    it('makes a successful request and marks the integration healthy', async () => {
      apiHub.registerIntegration('sms', { baseUrl: 'https://api.example.com' });
      axios.mockResolvedValue({ data: { success: true, id: 1 }, headers: {} });

      const result = await apiHub.callAPI('sms', '/send', { method: 'POST', data: { x: 1 } });

      expect(result).toEqual({ success: true, id: 1 });
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://api.example.com/send', method: 'POST' })
      );
      expect(apiHub.getIntegrationStatus('sms').healthStatus).toBe('healthy');
    });

    it('retries until success and resets the failure count', async () => {
      apiHub.registerIntegration('sms', { baseUrl: 'https://api.example.com' });
      axios
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true }, headers: {} });

      const result = await apiHub.callAPI('sms', '/send', {});

      expect(axios).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
      expect(apiHub.getIntegrationStatus('sms').failureCount).toBe(0);
    });

    it('throws after exhausting retries', async () => {
      apiHub.registerIntegration('sms', { baseUrl: 'https://api.example.com' });
      axios.mockRejectedValue(new Error('Network error'));

      await expect(apiHub.callAPI('sms', '/send', {})).rejects.toThrow('Network error');
      // initial + maxRetries(2) = 3 attempts
      expect(axios).toHaveBeenCalledTimes(3);
      expect(apiHub.getIntegrationStatus('sms').healthStatus).toBe('unhealthy');
    });

    it('falls over to the configured backup integration', async () => {
      apiHub.registerIntegration('primary', {
        baseUrl: 'https://primary.example.com',
        failoverIntegration: 'backup'
      });
      apiHub.registerIntegration('backup', { baseUrl: 'https://backup.example.com' });

      axios
        .mockRejectedValueOnce(new Error('Primary down')) // primary attempts
        .mockRejectedValueOnce(new Error('Primary down'))
        .mockRejectedValueOnce(new Error('Primary down'))
        .mockResolvedValueOnce({ data: { success: true }, headers: {} }); // backup succeeds

      const result = await apiHub.callAPI('primary', '/send', {});

      expect(result).toEqual({ success: true });
      // Last axios call must have hit the backup URL
      expect(axios.mock.calls.at(-1)[0].url).toBe('https://backup.example.com/send');
    });

    it('throws for unknown integrations', async () => {
      await expect(apiHub.callAPI('ghost', '/x', {})).rejects.toThrow('Integration not found');
    });
  });

  describe('checkHealth', () => {
    it('returns healthy when the health endpoint responds', async () => {
      apiHub.registerIntegration('sms', {
        baseUrl: 'https://api.example.com',
        healthEndpoint: '/health'
      });
      axios.mockResolvedValue({ headers: {} });

      const result = await apiHub.checkHealth('sms');

      expect(result.status).toBe('healthy');
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://api.example.com/health', method: 'GET' })
      );
    });

    it('returns unhealthy when the health endpoint fails', async () => {
      apiHub.registerIntegration('sms', {
        baseUrl: 'https://api.example.com',
        healthEndpoint: '/health'
      });
      axios.mockRejectedValue(new Error('API down'));

      const result = await apiHub.checkHealth('sms');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('API down');
    });

    it('reports no_health_check when no healthEndpoint is configured', async () => {
      apiHub.registerIntegration('sms', { baseUrl: 'https://api.example.com' });
      expect(await apiHub.checkHealth('sms')).toEqual({ status: 'no_health_check' });
    });
  });

  describe('getAllIntegrationStatuses', () => {
    it('lists every registered integration', () => {
      apiHub.registerIntegration('a', { baseUrl: 'https://a.example.com' });
      apiHub.registerIntegration('b', { baseUrl: 'https://b.example.com', failoverIntegration: 'a' });

      const all = apiHub.getAllIntegrationStatuses();
      expect(all).toHaveLength(2);
      expect(all.find(s => s.name === 'b').hasFailover).toBe(true);
    });
  });
});
