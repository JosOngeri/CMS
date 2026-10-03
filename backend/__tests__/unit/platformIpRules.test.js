/**
 * platformIpRules middleware — unit tests for §6.3 IP blocking.
 *
 * The middleware itself skips when NODE_ENV=test (api tests mock the
 * pool globally); these tests temporarily clear that flag and mock the
 * rules table to exercise the real code path.
 */
jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() },
}));

const platformIpRules = require('../../middleware/platformIpRules');
const { pool } = require('../../config/database');

const ORIGINAL_ENV = process.env.NODE_ENV;

const makeReq = (ip) => ({ ip });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  process.env.NODE_ENV = 'development';
  jest.clearAllMocks();
  platformIpRules._resetCache();
});

afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});

describe('rule parsing', () => {
  test('parses exact IPv4, IPv6, and CIDR rules', () => {
    expect(platformIpRules._parseRule('41.90.1.2')).toBeTruthy();
    expect(platformIpRules._parseRule('10.0.0.0/8')).toBeTruthy();
    expect(platformIpRules._parseRule('2001:db8::/32')).toBeTruthy();
    expect(platformIpRules._parseRule('not-an-ip')).toBeNull();
    expect(platformIpRules._parseRule('10.0.0.0/99')).toBeNull();
  });
});

describe('matching', () => {
  test('exact and CIDR rules match the right clients', () => {
    const exact = platformIpRules._parseRule('41.90.1.2');
    const range = platformIpRules._parseRule('10.0.0.0/8');
    expect(platformIpRules._matches(exact, require('ipaddr.js').parse('41.90.1.2'))).toBe(true);
    expect(platformIpRules._matches(exact, require('ipaddr.js').parse('41.90.1.3'))).toBe(false);
    expect(platformIpRules._matches(range, require('ipaddr.js').parse('10.9.9.9'))).toBe(true);
    expect(platformIpRules._matches(range, require('ipaddr.js').parse('11.0.0.1'))).toBe(false);
  });
});

describe('middleware', () => {
  test('denies a request matching an active deny rule', async () => {
    pool.query.mockResolvedValue({ rows: [{ cidr: '41.90.0.0/16', mode: 'deny' }] });
    const req = makeReq('41.90.5.5');
    const res = makeRes();
    const next = jest.fn();
    await platformIpRules(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('allows a request when no rule matches', async () => {
    pool.query.mockResolvedValue({ rows: [{ cidr: '41.90.0.0/16', mode: 'deny' }] });
    const next = jest.fn();
    await platformIpRules(makeReq('196.201.1.1'), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('an allow rule wins over a broader deny', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { cidr: '41.90.0.0/16', mode: 'deny' },
        { cidr: '41.90.5.5', mode: 'allow' },
      ],
    });
    const next = jest.fn();
    await platformIpRules(makeReq('41.90.5.5'), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('fails open when the rules table is unavailable', async () => {
    pool.query.mockRejectedValue(new Error('relation does not exist'));
    const next = jest.fn();
    await platformIpRules(makeReq('41.90.5.5'), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
