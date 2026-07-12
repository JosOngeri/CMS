/**
 * Global Jest Setup
 * Configures test environment and shared utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || 5432;
process.env.DB_NAME = process.env.DB_NAME || 'kmaincms';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

// Disable rate limiting for tests
process.env.DISABLE_RATE_LIMITING = 'true';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to generate test data
  generateTestUser: () => ({
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User'
  }),

  // Helper to generate test church
  generateTestChurch: () => ({
    name: `Test Church ${Date.now()}`,
    slug: `test-church-${Date.now()}`,
    is_active: true
  })
};

console.log('✅ Jest global setup complete');
