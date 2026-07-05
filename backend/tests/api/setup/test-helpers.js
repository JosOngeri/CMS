/**
 * test-helpers.js
 *
 * Shared utilities for the KMainCMS API test suite.
 *
 * Exported helpers
 * ─────────────────
 *  generateTestToken(payload)          – sign a JWT with the test secret
 *  createAdminToken()                  – JWT with role:Super Admin, id:999999
 *  createMemberToken(memberId)         – JWT with role:Member
 *  createPastorToken()                 – JWT with role:Pastor
 *  mockDbModule()                      – returns a fresh jest mock for config/database
 *  seedTestMember(overrides)          – factory for a mock member DB row
 *  seedTestUser(overrides)            – factory for a mock user DB row
 *  seedTestDocument(overrides)        – factory for a mock document DB row
 *  seedTestApproval(overrides)        – factory for a mock approval DB row
 *  TEST_SECRET                         – the shared JWT secret
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// ── Constants ─────────────────────────────────────────────────────────────────
const TEST_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-kmaincms-testing';

// ── UUID Helpers ─────────────────────────────────────────────────────────────
/**
 * Generate deterministic UUIDs for testing (based on seed string)
 * This ensures test IDs are consistent across test runs
 */
const generateTestUUID = (seed) => {
  // Simple hash-based UUID generation for consistency
  const hash = seed.split('').reduce((acc, char) => {
    acc = ((acc << 5) - acc) + char.charCodeAt(0);
    return acc & acc;
  }, 0);
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
};

// Pre-defined test UUIDs for consistency
const TEST_UUIDS = {
  admin: generateTestUUID('admin'),
  member: generateTestUUID('member'),
  pastor: generateTestUUID('pastor'),
  deptHead: generateTestUUID('dept_head'),
  document: generateTestUUID('document'),
  approval: generateTestUUID('approval'),
  sms: generateTestUUID('sms'),
  notification: generateTestUUID('notification'),
};

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Sign a JWT using the test secret.
 * @param {object} payload  – token payload (id, role, status, …)
 * @param {object} [opts]   – jsonwebtoken sign options (e.g. { expiresIn: '1h' })
 */
const generateTestToken = (payload, opts = { expiresIn: '1h' }) =>
  jwt.sign(payload, TEST_SECRET, opts);

/** Super Admin token – full access to all protected routes */
const createAdminToken = () =>
  generateTestToken({
    id:       TEST_UUIDS.admin,
    role:     'Super Admin',
    status:   'active',
    username: 'test_admin',
    email:    'admin@kmaincms.co.ke',
    name:     'Test Admin',
  });

/**
 * Member token.
 * @param {string} [memberId]  – the UUID user id embedded in the token
 */
const createMemberToken = (memberId = TEST_UUIDS.member) =>
  generateTestToken({
    id:       memberId,
    role:     'Member',
    status:   'active',
    username: 'test_member',
    email:    'member@kmaincms.co.ke',
    name:     'Test Member',
  });

/** Pastor token – subset of admin permissions */
const createPastorToken = () =>
  generateTestToken({
    id:       TEST_UUIDS.pastor,
    role:     'Pastor',
    status:   'active',
    username: 'test_pastor',
    email:    'pastor@kmaincms.co.ke',
    name:     'Test Pastor',
  });

/** Department Head token */
const createDepartmentHeadToken = () =>
  generateTestToken({
    id:       TEST_UUIDS.deptHead,
    role:     'Department Head',
    status:   'active',
    username: 'test_dept_head',
    email:    'dept_head@kmaincms.co.ke',
    name:     'Test Department Head',
  });

// ── DB mock factory ───────────────────────────────────────────────────────────

/**
 * Returns the shape expected by jest.mock('../../config/database', factory).
 * Callers can call db.query.mockResolvedValueOnce(…) to control per-test responses.
 */
const mockDbModule = () => ({
  pool: {
    query:   jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({
      query:   jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    end:     jest.fn().mockResolvedValue(undefined),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
});

// ── Seed factories ────────────────────────────────────────────────────────────

/**
 * Build a mock DB row representing a member.
 */
const seedTestMember = (overrides = {}) => ({
  id:                       TEST_UUIDS.member,
  user_id:                  TEST_UUIDS.member,
  first_name:               'John',
  last_name:                'Doe',
  email:                    'john.doe@kmaincms.co.ke',
  phone:                    '+254700000001',
  membership_status:       'active',
  joined_date:              '2024-01-15',
  department:              'Music Ministry',
  address:                  '123 Church Street',
  city:                     'Nairobi',
  country:                  'Kenya',
  created_at:               new Date().toISOString(),
  updated_at:               new Date().toISOString(),
  ...overrides,
});

/**
 * Build a mock DB row representing a user.
 */
const seedTestUser = (overrides = {}) => ({
  id:                  TEST_UUIDS.member,
  username:            'john.doe',
  email:               'john.doe@kmaincms.co.ke',
  password:            '$2b$10$mockHashedPasswordValue',
  role:                'Member',
  status:              'active',
  is_active:           true,
  created_at:          new Date().toISOString(),
  updated_at:          new Date().toISOString(),
  ...overrides,
});

/**
 * Build a mock document DB row.
 */
const seedTestDocument = (overrides = {}) => ({
  id:             TEST_UUIDS.document,
  name:           'Test Document.pdf',
  description:    'Test document description',
  file_path:      '/uploads/documents/test.pdf',
  file_type:      'application/pdf',
  file_size:      1024000,
  category:       'policies',
  uploaded_by:    TEST_UUIDS.admin,
  created_at:     new Date().toISOString(),
  updated_at:     new Date().toISOString(),
  ...overrides,
});

/**
 * Build a mock approval request DB row.
 */
const seedTestApproval = (overrides = {}) => ({
  id:             TEST_UUIDS.approval,
  title:          'Test Approval Request',
  description:    'Test approval description',
  type:           'content',
  status:         'pending',
  requested_by:   TEST_UUIDS.member,
  created_at:     new Date().toISOString(),
  updated_at:     new Date().toISOString(),
  ...overrides,
});

/**
 * Build a mock SMS DB row.
 */
const seedTestSMS = (overrides = {}) => ({
  id:             TEST_UUIDS.sms,
  recipient:      '+254700000001',
  message:        'Test SMS message',
  status:         'sent',
  sent_at:        new Date().toISOString(),
  created_by:     TEST_UUIDS.admin,
  created_at:     new Date().toISOString(),
  ...overrides,
});

/**
 * Build a mock notification DB row.
 */
const seedTestNotification = (overrides = {}) => ({
  id:             TEST_UUIDS.notification,
  user_id:        TEST_UUIDS.member,
  type:           'info',
  title:          'Test Notification',
  message:        'Test notification message',
  is_read:        false,
  created_at:     new Date().toISOString(),
  ...overrides,
});

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  TEST_SECRET,
  generateTestToken,
  generateTestUUID,
  TEST_UUIDS,
  createAdminToken,
  createMemberToken,
  createPastorToken,
  createDepartmentHeadToken,
  mockDbModule,
  seedTestMember,
  seedTestUser,
  seedTestDocument,
  seedTestApproval,
  seedTestSMS,
  seedTestNotification,
};
