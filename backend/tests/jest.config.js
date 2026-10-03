/**
 * Test Configuration for Phase 15
 * Enhanced Jest configuration for comprehensive testing
 */

module.exports = {
  // rootDir is the backend root so BOTH tests/ and __tests__/ trees are
  // reachable — the workflow patterns target `__tests__/unit/` which is
  // invisible when rootDir defaults to tests/.
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
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
  setupFilesAfterEnv: ['<rootDir>/tests/setup/global-setup.js'],
  testTimeout: 30000,
  verbose: true,
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^uuid$': '<rootDir>/tests/setup/uuid-mock.js',
    '^hibp$': '<rootDir>/tests/setup/hibp-mock.js'
  },
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(hibp|uuid)/)'
  ]
};
