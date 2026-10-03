/**
 * test-helpers.js
 *
 * Shared utilities for the Msabato CMS API test suite.
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
const TEST_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-msabato-testing';

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
  church: generateTestUUID('church'),
  document: generateTestUUID('document'),
  approval: generateTestUUID('approval'),
  sms: generateTestUUID('sms'),
  notification: generateTestUUID('notification'),
};

// Role each test identity maps to — mirrors what the DB seed would give them.
const TEST_ROLE_BY_UUID = {
  [TEST_UUIDS.admin]: 'Super Admin',
  [TEST_UUIDS.member]: 'Member',
  [TEST_UUIDS.pastor]: 'Pastor',
  [TEST_UUIDS.deptHead]: 'Department Head',
};

/**
 * Identity-aware default for mocked pool.query. authenticateToken →
 * IdentityService.getIdentity runs a users+churches lookup, then a roles and
 * a permissions query keyed on the token's userId ($1). A flat {rows:[]}
 * mock makes every authenticated test 401 — this answers the three identity
 * queries realistically and defers everything else to the caller's default.
 * Pass as mockImplementation; tests can still layer mockResolvedValueOnce.
 */
const identityAwareQuery = (text, params = []) => {
  const sql = typeof text === 'string' ? text : (text && text.text) || '';
  const role = TEST_ROLE_BY_UUID[params[0]];
  const empty = { rows: [], rowCount: 0 };

  if (/FROM\s+users\s+u\b/i.test(sql) && /JOIN\s+churches/i.test(sql)) {
    if (!role) return Promise.resolve(empty);
    return Promise.resolve({
      rows: [{
        id: params[0],
        email: 'test.user@msabato.co.ke',
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        phone: '+254700000000',
        is_active: true,
        church_id: TEST_UUIDS.church,
        church_slug: 'test-church',
        church_name: 'Test Church',
        mfa_enabled: false,
        mfa_secret: null,
      }],
      rowCount: 1,
    });
  }
  if (/FROM\s+roles\s+r\b/i.test(sql) && /user_roles/i.test(sql)) {
    return Promise.resolve(role ? { rows: [{ name: role }], rowCount: 1 } : empty);
  }
  if (/FROM\s+permissions\s+p\b/i.test(sql)) {
    return Promise.resolve(empty); // role checks drive authorization in tests
  }
  return Promise.resolve(empty);
};

/**
 * Build the identity object IdentityService.getIdentity would return for a
 * test user — pair with `jest.mock('services/IdentityService')` and
 * `getIdentity.mockImplementation(userId => identityFor(userId) ? resolve : reject)`.
 */
const identityFor = (userId, overrides = {}) => {
  const role = TEST_ROLE_BY_UUID[userId];
  if (!role) return null;
  return {
    id: userId,
    email: 'test.user@msabato.co.ke',
    username: 'test_user',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+254700000000',
    isActive: true,
    churchId: TEST_UUIDS.church,
    churchSlug: 'test-church',
    churchName: 'Test Church',
    roles: [role],
    permissions: [],
    mfaEnabled: false,
    mfaVerified: false,
    mfaSecret: null,
    ...overrides,
  };
};

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Sign a JWT using the test secret.
 * @param {object} payload  – token payload (id, role, status, …)
 * @param {object} [opts]   – jsonwebtoken sign options (e.g. { expiresIn: '1h' })
 */
const generateTestToken = (payload, opts = { expiresIn: '1h' }) =>
  jwt.sign(payload, TEST_SECRET, opts);

// The real middleware verifies { userId, roles, type, mfaVerified } claims
// with issuer/audience — sign through the app's own helper so test tokens are
// structurally identical to production ones (plain payload tokens 401).
const { generateAccessToken } = require('../../../helpers/security');
const tokenForUser = (userId, roles) => generateAccessToken(userId, roles);

/** Super Admin token – full access to all protected routes */
const createAdminToken = () => tokenForUser(TEST_UUIDS.admin, ['Super Admin']);

/**
 * Member token.
 * @param {string} [memberId]  – the UUID user id embedded in the token
 */
const createMemberToken = (memberId = TEST_UUIDS.member) =>
  tokenForUser(memberId, ['Member']);

/** Pastor token – subset of admin permissions */
const createPastorToken = () => tokenForUser(TEST_UUIDS.pastor, ['Pastor']);

/** Department Head token */
const createDepartmentHeadToken = () =>
  tokenForUser(TEST_UUIDS.deptHead, ['Department Head']);

// ── DB mock factory ───────────────────────────────────────────────────────────

/**
 * Returns the shape expected by jest.mock('../../config/database', factory).
 * Callers can call db.query.mockResolvedValueOnce(…) to control per-test responses.
 */
const mockDbModule = () => ({
  pool: {
    query:   jest.fn().mockImplementation(identityAwareQuery),
    connect: jest.fn().mockResolvedValue({
      query:   jest.fn().mockImplementation(identityAwareQuery),
      release: jest.fn(),
    }),
    end:     jest.fn().mockResolvedValue(undefined),
  },
  query: jest.fn().mockImplementation(identityAwareQuery),
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
  email:                    'john.doe@msabato.co.ke',
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
  email:               'john.doe@msabato.co.ke',
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
  identityAwareQuery,
  identityFor,
  TEST_ROLE_BY_UUID,
  mockDbModule,
  seedTestMember,
  seedTestUser,
  seedTestDocument,
  seedTestApproval,
  seedTestSMS,
  seedTestNotification,
};
