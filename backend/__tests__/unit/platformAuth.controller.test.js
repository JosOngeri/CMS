process.env.JWT_SECRET = 'platform-test-secret';

jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() }
}));
jest.mock('../../services/platformAudit.service', () => ({
  logPlatformAudit: jest.fn()
}));
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-platform-token')
}));

const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logPlatformAudit } = require('../../services/platformAudit.service');
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
      .mockResolvedValueOnce({ rows: [platformUser] })
      .mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValue(true);
    const req = {
      body: { email: 'OWNER@EXAMPLE.COM', password: 'correct-password' },
      ip: '127.0.0.1',
      get: jest.fn(() => 'jest')
    };
    const res = createResponse();

    await controller.login(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', platformUser.password_hash);
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ userId: platformUser.id, type: 'platform' }), 'platform-test-secret', { expiresIn: '8h' });
    expect(res.cookie).toHaveBeenCalledWith('platform_session', 'signed-platform-token', expect.objectContaining({ httpOnly: true }));
    expect(logPlatformAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'platform_auth.login_succeeded' }));
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
      get: jest.fn(() => 'jest')
    };
    const res = createResponse();

    await controller.login(req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(logPlatformAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'platform_auth.login_failed' }));
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
