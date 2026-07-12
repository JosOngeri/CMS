/**
 * global-setup.js
 *
 * Jest global setup file.
 * Runs once before all test suites.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-kmaincms-testing';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/kmaincms_test';

console.log('Jest global setup complete');
