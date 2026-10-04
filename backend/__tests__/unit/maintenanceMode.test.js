/**
 * Maintenance-mode middleware (13.6) — tenant traffic 503s while the
 * platform_settings.maintenance_mode flag is on; platform console,
 * health probes and CSRF fetches stay up so operators can work.
 */
jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() }
}));

const { pool } = require('../../config/database');
const maintenanceMode = require('../../middleware/maintenanceMode');

describe('maintenanceMode middleware', () => {
  const createRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  const next = jest.fn();
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development'; // middleware skips DB work under 'test'
    maintenanceMode._resetCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('lets traffic through when the flag is off', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ value: { enabled: false } }] });

    await maintenanceMode({ path: '/api/members' }, createRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('503s tenant API calls while the flag is on', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ value: { enabled: true, message: 'Back soon' } }] });
    const res = createRes();

    await maintenanceMode({ path: '/api/members' }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ maintenance: true, error: 'Back soon' }));
  });

  it('keeps the platform console reachable during maintenance', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ value: { enabled: true } }] });
    const res = createRes();

    await maintenanceMode({ path: '/api/platform/fleet' }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('fails open when the settings table is unavailable', async () => {
    pool.query.mockRejectedValueOnce(new Error('relation platform_settings does not exist'));

    await maintenanceMode({ path: '/api/members' }, createRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('skips the DB entirely under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';

    await maintenanceMode({ path: '/api/members' }, createRes(), next);

    expect(next).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });
});
