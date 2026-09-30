module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    '../controllers/**/*.js',
    '../routes/**/*.js',
    '!**/node_modules/**'
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
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../setup/uuid-mock.js',
    '^hibp$': '<rootDir>/../setup/hibp-mock.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(hibp|uuid)/)'
  ],
  testTimeout: 10000
};
