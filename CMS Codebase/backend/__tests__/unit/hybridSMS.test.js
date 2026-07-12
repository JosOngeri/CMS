/**
 * Unit Tests for Hybrid SMS Service
 */

const hybridSMS = require('../../services/hybridSMS');

// Mock dependencies
jest.mock('../../services/apiHub', () => ({
  makeRequest: jest.fn(),
  healthCheck: jest.fn()
}));

jest.mock('../../repositories/SMSProviderRepository', () => ({
  getActiveProviders: jest.fn(),
  updateProviderBalance: jest.fn()
}));

const apiHub = require('../../services/apiHub');
const SMSProviderRepository = require('../../repositories/SMSProviderRepository');

describe('Hybrid SMS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSMS', () => {
    it('should send SMS using primary provider', async () => {
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.makeRequest.mockResolvedValue({ success: true, messageId: 'MSG001' });

      const result = await hybridSMS.sendSMS('254712345678', 'Test message');

      expect(result).toHaveProperty('success', true);
      expect(result.messageId).toBe('MSG001');
      expect(apiHub.makeRequest).toHaveBeenCalled();
    });

    it('should failover to backup provider if primary fails', async () => {
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true },
        { id: 2, name: 'Airtel', url: 'https://airtel.api', priority: 2, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.makeRequest
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce({ success: true, messageId: 'MSG002' });

      const result = await hybridSMS.sendSMS('254712345678', 'Test message');

      expect(result).toHaveProperty('success', true);
      expect(apiHub.makeRequest).toHaveBeenCalledTimes(2);
    });

    it('should fail if all providers fail', async () => {
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true },
        { id: 2, name: 'Airtel', url: 'https://airtel.api', priority: 2, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.makeRequest.mockRejectedValue(new Error('Provider failed'));

      const result = await hybridSMS.sendSMS('254712345678', 'Test message');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    it('should validate phone number format', async () => {
      const result = await hybridSMS.sendSMS('invalid-phone', 'Test message');

      expect(result).toHaveProperty('success', false);
      expect(result.error).toContain('Invalid phone number');
    });
  });

  describe('sendBulkSMS', () => {
    it('should send SMS to multiple recipients', async () => {
      const recipients = ['254712345678', '254798765432', '254711223344'];
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.makeRequest.mockResolvedValue({ success: true, messageId: 'MSG001' });

      const result = await hybridSMS.sendBulkSMS(recipients, 'Bulk message');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('sentCount', 3);
      expect(result).toHaveProperty('failedCount', 0);
    });

    it('should handle partial failures in bulk send', async () => {
      const recipients = ['254712345678', '254798765432', '254711223344'];
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.makeRequest
        .mockResolvedValueOnce({ success: true, messageId: 'MSG001' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true, messageId: 'MSG003' });

      const result = await hybridSMS.sendBulkSMS(recipients, 'Bulk message');

      expect(result).toHaveProperty('success', true);
      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('provider health checks', () => {
    it('should check provider health', async () => {
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.healthCheck.mockResolvedValue({ healthy: true, status: 200 });

      const result = await hybridSMS.checkProviderHealth();

      expect(result).toHaveProperty('success', true);
      expect(result.providers).toHaveLength(1);
      expect(result.providers[0].healthy).toBe(true);
    });

    it('should mark unhealthy providers as inactive', async () => {
      const providers = [
        { id: 1, name: 'Safaricom', url: 'https://safaricom.api', priority: 1, is_active: true }
      ];

      SMSProviderRepository.getActiveProviders.mockResolvedValue(providers);
      apiHub.healthCheck.mockResolvedValue({ healthy: false, error: 'Timeout' });
      SMSProviderRepository.updateProviderBalance.mockResolvedValue(true);

      const result = await hybridSMS.checkProviderHealth();

      expect(result.providers[0].healthy).toBe(false);
    });
  });

  describe('balance tracking', () => {
    it('should track provider balance', async () => {
      const result = await hybridSMS.updateProviderBalance(1, 500);

      expect(result).toHaveProperty('success', true);
      expect(SMSProviderRepository.updateProviderBalance).toHaveBeenCalledWith(1, 500);
    });

    it('should get provider statistics', async () => {
      const result = await hybridSMS.getProviderStats();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('stats');
    });
  });
});
