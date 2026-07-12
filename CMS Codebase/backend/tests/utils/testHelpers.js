/**
 * Test Helpers
 * Utility functions for testing
 */

/**
 * Create a mock database row
 */
const createMockRow = (data) => ({
  ...data,
  id: data.id || 'test-id-123'
});

/**
 * Create a mock payment object
 */
const createMockPayment = (overrides = {}) => ({
  id: 'payment-123',
  member_id: 'user-123',
  phone_number: '254712345678',
  amount: 1000,
  notes: 'Test payment',
  status: 'pending',
  transaction_id: 'txn-123',
  mpesa_receipt_number: null,
  payment_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  payment_items: [],
  ...overrides
});

/**
 * Create a mock account object
 */
const createMockAccount = (overrides = {}) => ({
  id: 'account-123',
  account_number: '1000',
  account_name: 'Test Account',
  account_type: 'asset',
  sub_type: 'current',
  parent_account_id: null,
  fund_id: null,
  description: 'Test account',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Create a mock fund object
 */
const createMockFund = (overrides = {}) => ({
  id: 'fund-123',
  fund_code: 'TITHE',
  fund_name: 'Tithe Fund',
  fund_type: 'unrestricted',
  description: 'Tithe fund',
  purpose: 'For tithe contributions',
  start_date: '2024-01-01',
  end_date: null,
  target_amount: 100000,
  current_balance: 50000,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Mock successful database query result
 */
const mockQuerySuccess = (rows = []) => ({
  rows,
  rowCount: rows.length
});

/**
 * Mock failed database query result
 */
const mockQueryError = (message = 'Database error') => {
  const error = new Error(message);
  error.code = '23505'; // Unique violation
  throw error;
};

/**
 * Create a mock repository instance
 */
const createMockRepository = (tableName = 'test_table') => ({
  tableName,
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn()
});

module.exports = {
  createMockRow,
  createMockPayment,
  createMockAccount,
  createMockFund,
  mockQuerySuccess,
  mockQueryError,
  createMockRepository
};
