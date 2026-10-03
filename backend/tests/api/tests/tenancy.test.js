/**
 * tenancy.test.js
 *
 * Cross-church IDOR + authz regression tests for the M-Pesa routes,
 * which were previously mounted with no guards at all (fixed in the
 * Phase D1 security pass). These tests lock in:
 *
 *   - unauthenticated callers get 401 on every non-callback route
 *   - /history/:churchId is tenant-scoped (church A cannot read church B)
 *   - Super Admin may read across churches
 *   - /reverse requires a privileged role
 *   - /callback enforces signature when MPESA_CALLBACK_SECRET is set
 */

// -- Environment must exist before app modules load ---------------------------
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-msabato-testing';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-msabato-testing';
process.env.SESSION_SECRET = 'test-session-secret-for-msabato-testing';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'msabato_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

// -- Mocks (hoisted) -----------------------------------------------------------

jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    end: jest.fn(),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

jest.mock('../../../services/IdentityService', () => ({
  getIdentity: jest.fn(),
}));

jest.mock('../../../services/MpesaService', () => ({
  initiateSTK: jest.fn().mockResolvedValue({ checkoutRequestId: 'ws_CO_TEST' }),
  processCallback: jest.fn().mockResolvedValue({ processed: true }),
  checkTransactionStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
  reverseTransaction: jest.fn().mockResolvedValue({ reversed: true }),
  validateSignature: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../repositories/MpesaRepository', () => ({
  getSTKPushHistory: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
}));

// -- Imports -------------------------------------------------------------------
const request = require('supertest');
const jwt = require('jsonwebtoken');
const IdentityService = require('../../../services/IdentityService');
const mpesaRepository = require('../../../repositories/MpesaRepository');
const MpesaService = require('../../../services/MpesaService');
const { invalidateUserCache } = require('../../../middleware/auth');
const app = require('../../../app');

// supertest's default Host is 127.0.0.1:<port> — the tenantResolver treats
// '127' as a tenant subdomain and 404s. Force Host: localhost so no slug
// is extracted and the request reaches the router.
const api = (method, path) =>
  request(app)[method](path).set('Host', 'localhost');

// -- Fixtures ------------------------------------------------------------------
const CHURCH_A = '11111111-1111-1111-1111-111111111111';
const CHURCH_B = '22222222-2222-2222-2222-222222222222';
const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ADMIN = '99999999-9999-9999-9999-999999999999';

const identity = (overrides) => ({
  id: USER_A,
  email: 'a@test.local',
  username: 'userA',
  firstName: 'A',
  lastName: 'User',
  phoneNumber: null,
  churchId: CHURCH_A,
  churchSlug: 'church-a',
  churchName: 'Church A',
  roles: ['Member'],
  permissions: [],
  mfaEnabled: false,
  mfaVerified: false,
  isActive: true,
  ...overrides,
});

const tokenFor = (userId, roles = ['Member']) =>
  jwt.sign(
    { userId, roles, mfaVerified: true, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', issuer: 'msabato', audience: 'church' }
  );

beforeEach(() => {
  jest.clearAllMocks();
  invalidateUserCache(USER_A);
  invalidateUserCache(ADMIN);
  IdentityService.getIdentity.mockImplementation((userId) =>
    Promise.resolve(
      userId === ADMIN ? identity({ id: ADMIN, roles: ['Super Admin'] }) : identity({ id: userId })
    )
  );
});

// -- Unauthenticated access -----------------------------------------------------
describe('mpesa routes — unauthenticated', () => {
  // Under NODE_ENV=test the CSRF middleware runs: POSTs without Bearer are
  // blocked with 403 before auth; GETs reach authenticateToken → 401.
  // Either way the request is rejected before touching the service layer.
  const cases = [
    ['POST', '/api/mpesa/stk-push', { phone: '0712', amount: 10, churchId: CHURCH_A }, [401, 403]],
    ['GET', '/api/mpesa/status/ws_CO_TEST', null, [401]],
    ['POST', '/api/mpesa/reverse', { transactionId: 'X', amount: 10 }, [401, 403]],
    ['GET', `/api/mpesa/history/${CHURCH_A}`, null, [401]],
  ];

  test.each(cases)('%s %s → rejected', async (method, path, body, allowed) => {
    let req = api(method.toLowerCase(), path);
    if (body) req = req.send(body);
    const res = await req;
    expect(allowed).toContain(res.status);
    expect(MpesaService.initiateSTK).not.toHaveBeenCalled();
    expect(MpesaService.reverseTransaction).not.toHaveBeenCalled();
    expect(mpesaRepository.getSTKPushHistory).not.toHaveBeenCalled();
  });
});

// -- Tenant scoping on /history ------------------------------------------------
describe('GET /api/mpesa/history/:churchId — cross-church IDOR', () => {
  it('denies a church-A user reading church-B history', async () => {
    const res = await api('get', `/api/mpesa/history/${CHURCH_B}`)
      .set('Authorization', `Bearer ${tokenFor(USER_A)}`);

    expect(res.status).toBe(403);
    expect(mpesaRepository.getSTKPushHistory).not.toHaveBeenCalled();
  });

  it('allows a user reading their own church history', async () => {
    const res = await api('get', `/api/mpesa/history/${CHURCH_A}`)
      .set('Authorization', `Bearer ${tokenFor(USER_A)}`);

    expect(res.status).toBe(200);
    expect(mpesaRepository.getSTKPushHistory)
      .toHaveBeenCalledWith(CHURCH_A, expect.anything(), expect.anything());
  });

  it('allows Super Admin to read any church history', async () => {
    const res = await api('get', `/api/mpesa/history/${CHURCH_B}`)
      .set('Authorization', `Bearer ${tokenFor(ADMIN, ['Super Admin'])}`);

    expect(res.status).toBe(200);
    expect(mpesaRepository.getSTKPushHistory).toHaveBeenCalled();
  });
});

// -- Privileged reverse --------------------------------------------------------
describe('POST /api/mpesa/reverse — privileged', () => {
  it('denies a plain Member', async () => {
    const res = await api('post', '/api/mpesa/reverse')
      .set('Authorization', `Bearer ${tokenFor(USER_A)}`)
      .send({ transactionId: 'TX123', amount: 100 });

    expect(res.status).toBe(403);
    expect(MpesaService.reverseTransaction).not.toHaveBeenCalled();
  });

  it('allows a Treasurer', async () => {
    IdentityService.getIdentity.mockResolvedValueOnce(
      identity({ roles: ['Treasurer'] })
    );

    const res = await api('post', '/api/mpesa/reverse')
      .set('Authorization', `Bearer ${tokenFor(USER_A, ['Treasurer'])}`)
      .send({ transactionId: 'TX123', amount: 100 });

    expect(res.status).toBe(200);
    expect(MpesaService.reverseTransaction).toHaveBeenCalled();
  });
});

// -- Callback signature enforcement --------------------------------------------
describe('POST /api/mpesa/callback — signature enforcement', () => {
  const OLD_SECRET = process.env.MPESA_CALLBACK_SECRET;
  afterEach(() => { process.env.MPESA_CALLBACK_SECRET = OLD_SECRET; });

  it('rejects missing signature when secret is configured', async () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret-for-tests-123456';
    const res = await api('post', '/api/mpesa/callback').send({ Body: {} });
    expect(res.status).toBe(401);
    expect(MpesaService.processCallback).not.toHaveBeenCalled();
  });

  it('rejects invalid signature when secret is configured', async () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret-for-tests-123456';
    MpesaService.validateSignature.mockReturnValueOnce(false);
    const res = await api('post', '/api/mpesa/callback')
      .set('x-mpesa-signature', 'bogus')
      .send({ Body: {} });
    expect(res.status).toBe(401);
    expect(MpesaService.processCallback).not.toHaveBeenCalled();
  });

  it('accepts valid signature when secret is configured', async () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret-for-tests-123456';
    const res = await api('post', '/api/mpesa/callback')
      .set('x-mpesa-signature', 'valid')
      .send({ Body: {} });
    expect(res.status).toBe(200);
    expect(MpesaService.processCallback).toHaveBeenCalled();
  });

  it('refuses the callback when no secret is configured', async () => {
    // Hardened contract: with MPESA_CALLBACK_SECRET unset, accepting unsigned
    // callbacks would allow forged payment confirmations — the endpoint
    // returns 503 instead of processing them.
    delete process.env.MPESA_CALLBACK_SECRET;
    const res = await api('post', '/api/mpesa/callback').send({ Body: {} });
    expect(res.status).toBe(503);
    expect(MpesaService.processCallback).not.toHaveBeenCalled();
  });
});
