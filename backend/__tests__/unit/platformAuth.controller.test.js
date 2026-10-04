process.env.PLATFORM_JWT_SECRET = 'platform-test-secret';

jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() }
}));
jest.mock('../../services/platformAudit.service', () => ({
  logPlatformAudit: jest.fn(),
  auditPlatformAction: jest.fn(),
  normalizeIp: jest.fn((ip) => ip.replace(/:\d+$/, ''))
}));
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-platform-token')
}));
jest.mock('../../helpers/totp', () => ({
  generateSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  verify: jest.fn(),
  otpauthUri: jest.fn(() => 'otpauth://totp/test')
}));

const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auditPlatformAction } = require('../../services/platformAudit.service');
const totp = require('../../helpers/totp');
const controller = require('../../controllers/platformAuth.controller');

describe('PlatformAuthController', () => {
  const platformUser = {
    id: '4d9e72ad-bf87-44b4-9d57-9db7900d4e5a',
    email: 'owner@example.com',
    name: 'Platform Owner',
    role: 'platform_owner',
    permissions: ['*'],
    password_hash: '$2a$12$example',
    failed_login_attempts: 0,
    locked_until: null
  };

  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an HttpOnly session after a valid password check', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [platformUser] }) // SELECT user
      .mockResolvedValueOnce({ rows: [] }) // INSERT platform_sessions
      .mockResolvedValueOnce({ rows: [] }); // UPDATE last_login
    bcrypt.compare.mockResolvedValue(true);
    const req = {
      body: { email: 'OWNER@EXAMPLE.COM', password: 'correct-password' },
      ip: '154.159.252.97:29174',
      headers: { 'user-agent': 'jest' },
      get: jest.fn(() => 'jest')
    };
    const res = createResponse();

    await controller.login(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', platformUser.password_hash);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ userId: platformUser.id, type: 'platform' }),
      'platform-test-secret',
      expect.objectContaining({ expiresIn: '8h', issuer: 'msabato-platform', audience: 'platform' })
    );
    expect(res.cookie).toHaveBeenCalledWith('platform_session', 'signed-platform-token', expect.objectContaining({ httpOnly: true }));
    expect(pool.query.mock.calls[1][1][2]).toBe('154.159.252.97');
    expect(auditPlatformAction).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '154.159.252.97:29174' }),
      expect.objectContaining({ action: 'platform_auth.login_succeeded' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('records a failed password check without issuing a session', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [platformUser] })
      .mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValue(false);
    const req = {
      body: { email: platformUser.email, password: 'wrong-password' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      get: jest.fn(() => 'jest')
    };
    const res = createResponse();

    await controller.login(req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(auditPlatformAction).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '127.0.0.1' }),
      expect.objectContaining({ action: 'platform_auth.login_failed' })
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  describe('MFA (3.4)', () => {
    const mfaUser = { ...platformUser, mfa_enabled: true, mfa_secret: 'JBSWY3DPEHPK3PXP' };
    const req = (body) => ({
      body,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      get: jest.fn(() => 'jest')
    });

    it('asks for an authenticator code before issuing a session', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mfaUser] });
      bcrypt.compare.mockResolvedValue(true);
      const res = createResponse();

      await controller.login(req({ email: mfaUser.email, password: 'correct-password' }), res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MFA_REQUIRED' }));
      expect(res.cookie).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('rejects a wrong code and audits mfa_failed', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mfaUser] });
      bcrypt.compare.mockResolvedValue(true);
      totp.verify.mockReturnValue(false);
      const res = createResponse();

      await controller.login(req({ email: mfaUser.email, password: 'correct-password', totp: '000000' }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MFA_INVALID' }));
      expect(res.cookie).not.toHaveBeenCalled();
      expect(auditPlatformAction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'platform_auth.mfa_failed' })
      );
    });

    it('issues a session when password + code both check out', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [mfaUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      bcrypt.compare.mockResolvedValue(true);
      totp.verify.mockReturnValue(true);
      const res = createResponse();

      await controller.login(req({ email: mfaUser.email, password: 'correct-password', totp: '123456' }), res);

      expect(totp.verify).toHaveBeenCalledWith(mfaUser.mfa_secret, '123456');
      expect(res.cookie).toHaveBeenCalledWith('platform_session', 'signed-platform-token', expect.objectContaining({ httpOnly: true }));
    });
  });
});
