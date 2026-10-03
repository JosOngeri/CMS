/**
 * auth.test.js
 *
 * Full test suite for authentication endpoints and the JWT auth middleware.
 *
 * Mocking strategy
 * -----------------
 *  * config/database -- all SQL calls go to jest.fn(); each test seeds its own response
 *                      using mockResolvedValueOnce so sequential queries are independent.
 *  * bcryptjs     -- NOT mocked at module level. We use real bcrypt with a low cost
 *                   factor (4) for speed, which keeps tests honest.
 *  * email util   -- sendEmail is a no-op mock (avoids SMTP errors).
 *
 * Key controller behaviour (from auth.controller.js)
 * ----------------------------------------------------
 *  Login    -- User.findOne -> bcrypt.compare -> jwt.sign -> { token }
 *  Register -- User.findOne (dup check) -> new User -> user.save -> jwt.sign -> { token }
 *  Forgot   -- User.findOne by email -> user.save -> sendEmail (silent failure ok)
 *  Reset    -- User.findOne by resetToken+expiry -> bcrypt.hash -> user.save
 */

// -- jest.mock calls are hoisted – must appear before any require --------------

jest.mock('../../../config/database', () => {
  // One shared jest.fn for both access styles — repositories call
  // pool.query while some helpers use query() directly.
  const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return {
    pool: {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
      end: jest.fn(),
    },
    query: mockQuery,
  };
});

jest.mock('../../../utils/emailService.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ sent: true }),
  sendPasswordReset: jest.fn().mockResolvedValue({ sent: true }),
}));

// -- Imports -------------------------------------------------------------------
jest.mock('../../../services/IdentityService', () => ({
  getIdentity: jest.fn(),
  invalidateIdentityCache: jest.fn(),
  hasAnyRole: jest.fn((identity, roles) =>
    Array.isArray(identity && identity.roles) && identity.roles.some(r => roles.includes(r))),
  validateMFA: jest.fn().mockResolvedValue(false),
  setMFAVerified: jest.fn(identity => ({ ...identity, mfaVerified: true })),
}));

const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const app      = require('../../../app');
const db       = require('../../../config/database');
const emailService = require('../../../utils/emailService');
const { sendEmail } = emailService;
const IdentityService = require('../../../services/IdentityService');
const { createAdminToken, createMemberToken, seedTestUser, TEST_UUIDS, identityFor } = require('../setup/test-helpers');

// -- Pre-compute a real bcrypt hash so bcrypt.compare works correctly ----------
// Cost factor 4 = very fast (~5ms) while still being real bcrypt
const TEST_PASSWORD      = 'TestPass123!';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

// -- Row helpers ---------------------------------------------------------------

const mockUserRow = (overrides = {}) =>
  seedTestUser({
    id:                    TEST_UUIDS.member,
    username:              'testuser',
    email:                 'testuser@msabato.co.ke',
    password:              TEST_PASSWORD_HASH,   // real hash of TEST_PASSWORD
    password_hash:         TEST_PASSWORD_HASH,   // controller compares this column
    role:                  'Member',
    status:                'active',
    is_active:             true,
    church_id:             TEST_UUIDS.church,
    failed_login_attempts: 0,
    locked_until:          null,
    ...overrides,
  });

const TEST_CHURCH_ROW = {
  id: TEST_UUIDS.church, slug: 'test-church', name: 'Test Church', is_active: true,
};

/**
 * SQL-text dispatcher for the mocked pool. Each endpoint runs several
 * queries per call, so positional mockResolvedValueOnce chains are brittle —
 * dispatch on the targeted table instead. Tests that need an empty result
 * (e.g. "user not found") pass different row sets via the options.
 */
const dbDispatch = ({
  users = [], resetTokens = [], churches = [TEST_CHURCH_ROW],
  insertedUser = null, member = null,
} = {}) => (text) => {
  const sql = String((text && text.text) || text || '');
  if (/from\s+users\b/i.test(sql)) {
    // WHERE id = … lookups (e.g. assignRole's church-membership check) must
    // see the member row, not the email/username duplicate-check set.
    const idRows = member ? [member] : (insertedUser ? [insertedUser] : users);
    const rows = /where\s+id\s*=/i.test(sql) ? idRows : users;
    return Promise.resolve({ rows, rowCount: rows.length });
  }
  if (/from\s+churches\b/i.test(sql)) {
    return Promise.resolve({ rows: churches, rowCount: churches.length });
  }
  if (/insert\s+into\s+users\b/i.test(sql)) {
    return Promise.resolve({ rows: insertedUser ? [insertedUser] : [{}], rowCount: 1 });
  }
  if (/select[\s\S]*from\s+password_reset_tokens/i.test(sql)) {
    return Promise.resolve({ rows: resetTokens, rowCount: resetTokens.length });
  }
  if (/from\s+roles\b|\buser_roles\b/i.test(sql)) {
    return Promise.resolve({ rows: [{ id: 'role-1', name: 'Member' }], rowCount: 1 });
  }
  return Promise.resolve({ rows: [{ id: TEST_UUIDS.member }], rowCount: 1 });
};

// -----------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  IdentityService.getIdentity.mockImplementation((userId) => {
    const identity = identityFor(userId);
    return identity ? Promise.resolve(identity) : Promise.reject(new Error('User not found'));
  });
  db.query.mockReset();
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  sendEmail.mockResolvedValue({ sent: false });
  emailService.sendPasswordReset.mockResolvedValue({ sent: true });
});

// =============================================================================
// POST /api/auth/login
// =============================================================================
describe('POST /api/auth/login', () => {
  // -- happy path --------------------------------------------------------------
  it('returns 200 with access/refresh tokens for valid credentials', async () => {
    db.query.mockImplementation(dbDispatch({ users: [mockUserRow()] }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@msabato.co.ke', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(res.body.data.user.email).toBe('testuser@msabato.co.ke');
  });

  // -- wrong password ----------------------------------------------------------
  it('returns 401 { error: "Invalid credentials" } when password is wrong', async () => {
    db.query.mockImplementation(dbDispatch({ users: [mockUserRow()] }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@msabato.co.ke', password: 'wrong_password_totally' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // -- user not found ----------------------------------------------------------
  it('returns 401 { error: "Invalid credentials" } when user does not exist', async () => {
    db.query.mockImplementation(dbDispatch({ users: [] }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@msabato.co.ke', password: 'any' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // -- inactive / deactivated user ---------------------------------------------
  it('returns 401 for inactive accounts (no existence leak)', async () => {
    db.query.mockImplementation(dbDispatch({ users: [mockUserRow({ is_active: false })] }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@msabato.co.ke', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // -- missing email -----------------------------------------------------------
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(400);
  });

  // -- missing password ---------------------------------------------------------
  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@msabato.co.ke' });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// POST /api/auth/register
// =============================================================================
describe('POST /api/auth/register', () => {
  const validPayload = {
    email:      'newuser@msabato.co.ke',
    username:   'newuser',
    first_name: 'New',
    last_name:  'User',
    password:   'Str0ng#Falcon',  // passes validatePasswordStrength (no sequences/common words)
  };

  // -- happy path --------------------------------------------------------------
  it('returns 200 and the created user for valid registration', async () => {
    const savedUser = seedTestUser({
      id: TEST_UUIDS.member, username: 'newuser',
      email: 'newuser@msabato.co.ke', first_name: 'New', last_name: 'User',
    });
    db.query.mockImplementation(dbDispatch({ users: [], insertedUser: savedUser }));

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('newuser@msabato.co.ke');
  });

  // -- duplicate email ----------------------------------------------------------
  it('returns 409 { error: "Email already registered" } for a duplicate email', async () => {
    db.query.mockImplementation(dbDispatch({ users: [mockUserRow()] }));

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  // -- weak password -------------------------------------------------------------
  it('returns 400 for a password that fails the strength policy', async () => {
    db.query.mockImplementation(dbDispatch({ users: [] }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, password: 'Password123!' }); // common word + sequence

    expect(res.status).toBe(400);
  });

  // -- missing required fields -----------------------------------------------
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'incomplete' });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// POST /api/auth/forgot-password
// =============================================================================
describe('POST /api/auth/forgot-password', () => {
  // Pre-login endpoints are CSRF-protected: mint a session-bound token via
  // /api/csrf-token and present it with the same cookie jar, like a browser.
  const csrfAgent = async () => {
    const agent = request.agent(app);
    const csrf = await agent.get('/api/csrf-token');
    return { agent, token: csrf.body.csrfToken };
  };

  it('returns 200 and sends a reset link when the email exists', async () => {
    db.query.mockImplementation(dbDispatch({ users: [mockUserRow()] }));
    const { agent, token } = await csrfAgent();

    const res = await agent
      .post('/api/auth/forgot-password')
      .set('x-csrf-token', token)
      .send({ email: 'testuser@msabato.co.ke' });

    expect(res.status).toBe(200);
    expect(emailService.sendPasswordReset).toHaveBeenCalled();
  });

  it('returns 200 even when email does not exist (security best practice)', async () => {
    db.query.mockImplementation(dbDispatch({ users: [] }));
    const { agent, token } = await csrfAgent();

    const res = await agent
      .post('/api/auth/forgot-password')
      .set('x-csrf-token', token)
      .send({ email: 'nonexistent@msabato.co.ke' });

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// POST /api/auth/reset-password
// =============================================================================
describe('POST /api/auth/reset-password', () => {
  const csrfAgent = async () => {
    const agent = request.agent(app);
    const csrf = await agent.get('/api/csrf-token');
    return { agent, token: csrf.body.csrfToken };
  };

  it('returns 200 when the reset token is valid', async () => {
    db.query.mockImplementation(dbDispatch({
      users: [mockUserRow()],
      resetTokens: [{ user_id: TEST_UUIDS.member }],
    }));
    const { agent, token } = await csrfAgent();

    const res = await agent
      .post('/api/auth/reset-password')
      .set('x-csrf-token', token)
      .send({ token: 'valid_token', newPassword: 'Str0ng#Falcon' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when the reset token is invalid', async () => {
    db.query.mockImplementation(dbDispatch({ resetTokens: [] }));
    const { agent, token } = await csrfAgent();

    const res = await agent
      .post('/api/auth/reset-password')
      .set('x-csrf-token', token)
      .send({ token: 'invalid_token', newPassword: 'Str0ng#Falcon' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the new password fails the strength policy', async () => {
    db.query.mockImplementation(dbDispatch({
      resetTokens: [{ user_id: TEST_UUIDS.member }],
    }));
    const { agent, token } = await csrfAgent();

    const res = await agent
      .post('/api/auth/reset-password')
      .set('x-csrf-token', token)
      .send({ token: 'valid_token', newPassword: 'NewPass123!' });

    expect(res.status).toBe(400);
  });
});
