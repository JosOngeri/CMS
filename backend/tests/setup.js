/**
 * Test Setup
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock logger to avoid console output during tests
jest.mock('../config/logging', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  }))
};

jest.mock('../config/database', () => ({
  pool: mockPool,
  connectDB: jest.fn()
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
