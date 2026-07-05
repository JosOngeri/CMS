/**
 * Unit Tests for API Hub Service
 */

const apiHub = require('../../services/apiHub');

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

const axios = require('axios');

describe('API Hub Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('makeRequest', () => {
    it('should make successful POST request', async () => {
      const mockResponse = { data: { success: true, data: { id: 1 } } };
      axios.post.mockResolvedValue(mockResponse);

      const result = await apiHub.makeRequest('POST', 'https://api.example.com/endpoint', { test: 'data' });

      expect(axios.post).toHaveBeenCalledWith('https://api.example.com/endpoint', { test: 'data' }, expect.any(Object));
      expect(result).toEqual({ success: true, data: { id: 1 } });
    });

    it('should retry on failure', async () => {
      axios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true } });

      const result = await apiHub.makeRequest('POST', 'https://api.example.com/endpoint', {}, { maxRetries: 3 });

      expect(axios.post).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should fail after max retries', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        apiHub.makeRequest('POST', 'https://api.example.com/endpoint', {}, { maxRetries: 2 })
      ).rejects.toThrow('Network error');

      expect(axios.post).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use failover provider if primary fails', async () => {
      const providers = [
        { url: 'https://primary.example.com', apiKey: 'key1' },
        { url: 'https://backup.example.com', apiKey: 'key2' }
      ];

      axios.post
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce({ data: { success: true } });

      const result = await apiHub.makeRequestWithFailover('POST', '/endpoint', {}, providers);

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for working API', async () => {
      axios.get.mockResolvedValue({ status: 200 });

      const result = await apiHub.healthCheck('https://api.example.com/health');

      expect(result).toEqual({ healthy: true, status: 200 });
    });

    it('should return unhealthy status for failing API', async () => {
      axios.get.mockRejectedValue(new Error('API down'));

      const result = await apiHub.healthCheck('https://api.example.com/health');

      expect(result).toEqual({ healthy: false, error: 'API down' });
    });
  });

  describe('trackUsage', () => {
    it('should track API usage statistics', () => {
      apiHub.trackUsage('sms-provider-1', 'POST', 200, 150);

      const stats = apiHub.getUsageStats('sms-provider-1');
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.totalResponseTime).toBe(150);
    });

    it('should track failed requests', () => {
      apiHub.trackUsage('sms-provider-1', 'POST', 500, 100);

      const stats = apiHub.getUsageStats('sms-provider-1');
      expect(stats.failedRequests).toBe(1);
    });
  });
});
