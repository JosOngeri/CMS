/**
 * Test Configuration for Phase 15
 * Enhanced Jest configuration for comprehensive testing
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  collectCoverageFrom: [
    '../controllers/**/*.js',
    '../services/**/*.js',
    '../repositories/**/*.js',
    '../middleware/**/*.js',
    '../utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  setupFilesAfterEnv: ['<rootDir>/setup/global-setup.js'],
  testTimeout: 30000,
  verbose: true,
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1'
  },
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(hibp)/)'
  ]
};
