/**
 * apiHub.test.js
 * Test suite for API Hub service
 */

const apiHub = require('../../../services/apiHub');

describe('API Hub Service', () => {
  beforeEach(() => {
    // Clear integrations before each test
    apiHub.integrations.clear();
  });

  describe('registerIntegration', () => {
    test('should register a new integration', () => {
      apiHub.registerIntegration('test-provider', {
        baseUrl: 'https://api.test.com',
        headers: { 'Authorization': 'Bearer test' }
      });

      expect(apiHub.integrations.has('test-provider')).toBe(true);
      expect(apiHub.integrations.get('test-provider').baseUrl).toBe('https://api.test.com');
    });

    test('should set default health status', () => {
      apiHub.registerIntegration('test-provider', {
        baseUrl: 'https://api.test.com'
      });

      const integration = apiHub.integrations.get('test-provider');
      expect(integration.healthStatus).toBe('unknown');
      expect(integration.failureCount).toBe(0);
    });
  });

  describe('getIntegrationStatus', () => {
    test('should return not found for non-existent integration', () => {
      const status = apiHub.getIntegrationStatus('non-existent');
      expect(status.status).toBe('not_found');
    });

    test('should return integration status for existing integration', () => {
      apiHub.registerIntegration('test-provider', {
        baseUrl: 'https://api.test.com'
      });

      const status = apiHub.getIntegrationStatus('test-provider');
      expect(status.name).toBe('test-provider');
      expect(status.healthStatus).toBe('unknown');
    });
  });

  describe('getAllIntegrationStatuses', () => {
    test('should return empty array when no integrations', () => {
      const statuses = apiHub.getAllIntegrationStatuses();
      expect(statuses).toEqual([]);
    });

    test('should return all integration statuses', () => {
      apiHub.registerIntegration('provider1', { baseUrl: 'https://api1.com' });
      apiHub.registerIntegration('provider2', { baseUrl: 'https://api2.com' });

      const statuses = apiHub.getAllIntegrationStatuses();
      expect(statuses).toHaveLength(2);
      expect(statuses[0].name).toBe('provider1');
      expect(statuses[1].name).toBe('provider2');
    });
  });

  describe('failover configuration', () => {
    test('should support failover configuration', () => {
      apiHub.registerIntegration('primary', {
        baseUrl: 'https://primary.com',
        failoverIntegration: 'backup'
      });

      apiHub.registerIntegration('backup', {
        baseUrl: 'https://backup.com'
      });

      const primary = apiHub.integrations.get('primary');
      expect(primary.failoverIntegration).toBe('backup');
    });
  });
});
