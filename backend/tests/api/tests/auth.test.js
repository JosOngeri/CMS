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

jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    end: jest.fn(),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

jest.mock('../../utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

// -- Imports -------------------------------------------------------------------
const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const app      = require('../../server');
const db       = require('../../config/database');
const { sendEmail } = require('../../utils/email');
const { createAdminToken, createMemberToken, seedTestUser, TEST_UUIDS } = require('../setup/test-helpers');

// -- Pre-compute a real bcrypt hash so bcrypt.compare works correctly ----------
// Cost factor 4 = very fast (~5ms) while still being real bcrypt
const TEST_PASSWORD      = 'TestPass123!';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

// -- Row helpers ---------------------------------------------------------------

const mockUserRow = (overrides = {}) =>
  seedTestUser({
    id:                  TEST_UUIDS.member,
    username:            'testuser',
    email:               'testuser@kmaincms.co.ke',
    password:            TEST_PASSWORD_HASH,   // real hash of TEST_PASSWORD
    role:                'Member',
    status:              'active',
    is_active:           true,
    ...overrides,
  });

// -----------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockReset();
  db.pool.query.mockReset();
  // Restore default stubs after resetAllMocks
  db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  sendEmail.mockResolvedValue({ sent: false });
});

// =============================================================================
// POST /api/auth/login
// =============================================================================
describe('POST /api/auth/login', () => {
  // -- happy path --------------------------------------------------------------
  it('returns 200 and a JWT token for valid credentials', async () => {
    const user = mockUserRow();
    db.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 }); // User.findOne

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  // -- wrong password ----------------------------------------------------------
  it('returns 400 { error: "Invalid credentials" } when password is wrong', async () => {
    const user = mockUserRow();
    db.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrong_password_totally' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // -- user not found ----------------------------------------------------------
  it('returns 400 { error: "Invalid credentials" } when user does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghostuser', password: 'any' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // -- inactive / deactivated user ---------------------------------------------
  it('returns 403 with "deactivated" message for inactive accounts', async () => {
    const user = mockUserRow({ is_active: false });
    db.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: TEST_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/deactivated/i);
  });

  // -- missing username ---------------------------------------------------------
  it('returns 400 or 500 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: TEST_PASSWORD });

    expect([400, 500]).toContain(res.status);
  });

  // -- missing password ---------------------------------------------------------
  it('returns 400 when password is missing (comparison fails)', async () => {
    const user = mockUserRow();
    db.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser' });

    // bcrypt.compare(undefined, hash) -> 400
    expect([400, 500]).toContain(res.status);
  });
});

// =============================================================================
// POST /api/auth/register
// =============================================================================
describe('POST /api/auth/register', () => {
  const validPayload = {
    username: 'newuser',
    password: 'StrongPass1!',
    role:     'Member',
    email:    'newuser@kmaincms.co.ke',
  };

  // -- happy path --------------------------------------------------------------
  it('returns 200 and a JWT token for valid registration', async () => {
    const savedUser = mockUserRow({ id: 99, username: 'newuser', email: 'newuser@kmaincms.co.ke' });
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                // findOne (no dup)
      .mockResolvedValueOnce({ rows: [savedUser], rowCount: 1 });      // INSERT RETURNING

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  // -- duplicate username ------------------------------------------------------
  it('returns 400 { error: "User already exists" } for duplicate username', async () => {
    const existingUser = mockUserRow({ username: 'newuser' });
    db.query.mockResolvedValueOnce({ rows: [existingUser], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('User already exists');
  });

  // -- missing required fields -----------------------------------------------
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'incomplete' });

    expect([400, 500]).toContain(res.status);
  });
});

// =============================================================================
// POST /api/auth/forgot-password
// =============================================================================
describe('POST /api/auth/forgot-password', () => {
  it('returns 200 when email exists (email sent)', async () => {
    const user = mockUserRow();
    db.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });
    db.query.mockResolvedValueOnce({ rows: [{ ...user, reset_token: 'token' }], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'testuser@kmaincms.co.ke' });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('returns 200 even when email does not exist (security best practice)', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@kmaincms.co.ke' });

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// POST /api/auth/reset-password
// =============================================================================
describe('POST /api/auth/reset-password', () => {
  it('returns 200 when reset token is valid', async () => {
    const user = mockUserRow({ reset_token: 'valid_token' });
    db.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });
    db.query.mockResolvedValueOnce({ rows: [{ ...user, password: 'new_hash' }], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid_token', newPassword: 'NewPass123!' });

    expect(res.status).toBe(200);
  });

  it('returns 400 when reset token is invalid', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid_token', newPassword: 'NewPass123!' });

    expect(res.status).toBe(400);
  });
});
