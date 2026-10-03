/**
 * Audit regression tests (L783).
 * Each describe block pins a previously logged blocker so a future change
 * cannot silently reintroduce it:
 *  - migration runner must abort on real errors (L726/L782)
 *  - dashboard API returns camelCase keys the Flutter app reads (B19/L728)
 *  - approval writes populate requester_id, not only requested_by (L772)
 *  - approval reads always scope by church_id (tenant isolation)
 *  - frontend vite/playwright/cypress/dockerfile stay in sync (B21/L766/L767)
 *  - SMS provider api_key round-trips through at-rest encryption (L780)
 */

jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() },
}));

const fs = require('fs');
const path = require('path');
const { pool } = require('../../config/database');

describe('setup-test-db runMigration (L726/L782)', () => {
  const { runMigration } = require('../../scripts/setup-test-db.js');
  const tmpFile = path.join(__dirname, 'tmp_regression_migration.sql');

  beforeAll(() => fs.writeFileSync(tmpFile, 'SELECT 1;'));
  afterAll(() => fs.unlinkSync(tmpFile));
  beforeEach(() => jest.clearAllMocks());

  it('re-throws real migration errors instead of swallowing them', async () => {
    const err = new Error('syntax error');
    err.code = '42601'; // not a benign already-exists code
    pool.query.mockRejectedValueOnce(err);
    await expect(runMigration(pool, tmpFile)).rejects.toThrow('syntax error');
  });

  it('marks benign already-exists errors as applied', async () => {
    const err = new Error('already exists');
    err.code = '42P07';
    pool.query
      .mockRejectedValueOnce(err)          // migration body
      .mockResolvedValueOnce({ rows: [] }); // schema_migrations insert
    await expect(runMigration(pool, tmpFile)).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('schema_migrations'),
      [path.basename(tmpFile)]
    );
  });
});

describe('DashboardRepository.getFinancialStats (B19/L728)', () => {
  const DashboardRepository = require('../../repositories/DashboardRepository');

  beforeEach(() => jest.clearAllMocks());

  it('returns camelCase keys consumed by the Flutter dashboard', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total_balance: '1200.5', monthly_income: '300', monthly_expenses: '100' }] })
      .mockResolvedValueOnce({ rows: [{ pending_payments: '4' }] });

    const stats = await DashboardRepository.getFinancialStats('church-1');
    expect(stats).toEqual({
      totalBalance: 1200.5,
      pendingPayments: 4,
      monthlyIncome: 300,
      monthlyExpenses: 100,
    });
    // snake_case keys must not leak — the app reads totalBalance etc.
    for (const key of Object.keys(stats)) {
      expect(key).not.toContain('_');
    }
  });
});

describe('approval_requests requester column (L772)', () => {
  const PaymentRepository = require('../../repositories/PaymentRepository');
  const ApprovalsRepository = require('../../repositories/ApprovalsRepository');

  beforeEach(() => jest.clearAllMocks());

  it('createApprovalRequest writes requester_id (canonical) not only requested_by', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'a1' }] });
    await PaymentRepository.createApprovalRequest('refund', 'payments', 50, 'test', 'u1', {}, 'c1');
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('requester_id');
  });

  it('approval reads filter by church_id (tenant isolation)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await ApprovalsRepository.getAll({}, 'church-xyz');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('church_id');
    expect(params[0]).toBe('church-xyz');
  });
});

describe('frontend config consistency (B21/L766/L767)', () => {
  const frontend = path.join(__dirname, '..', '..', '..', 'frontend');
  const read = (f) => fs.readFileSync(path.join(frontend, f), 'utf8');

  it('playwright + cypress target the vite dev port', () => {
    const vite = read('vite.config.js');
    const port = (vite.match(/port:\s*(\d+)/) || [])[1];
    expect(port).toBeTruthy();
    expect(read('playwright.config.js')).toContain(`localhost:${port}`);
    expect(read('cypress.config.js')).toContain(`localhost:${port}`);
  });

  it('Dockerfile copies the real vite outDir', () => {
    const vite = read('vite.config.js');
    const outDir = (vite.match(/outDir:\s*'([^']+)'/) || [])[1] || 'dist';
    expect(read('Dockerfile')).toContain(`/app/${outDir}`);
  });
});

describe('UserRepository.getMemberDirectory (B12)', () => {
  const UserRepository = require('../../repositories/UserRepository');

  beforeEach(() => jest.clearAllMocks());

  it('returns roles[] and departments[] arrays the member directory UI filters on', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'u1', roles: ['Member'], departments: ['Youth Ministry'] }] })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const { users } = await UserRepository.getMemberDirectory({}, 'church-1');
    expect(Array.isArray(users[0].roles)).toBe(true);
    expect(Array.isArray(users[0].departments)).toBe(true);
    // The directory SELECT must project departments — a plain users row lacks it
    const selectSql = pool.query.mock.calls[0][0];
    expect(selectSql).toContain('department_members');
    expect(selectSql).toContain('departments');
  });
});

describe('secretBox at-rest encryption (L780)', () => {
  const secretBox = require('../../utils/secretBox');
  const OLD = process.env.SMS_KEYS_SECRET;

  beforeAll(() => { process.env.SMS_KEYS_SECRET = 'test-secret'; });
  afterAll(() => { process.env.SMS_KEYS_SECRET = OLD; });

  it('encrypts to enc:v1 format and round-trips', () => {
    const enc = secretBox.encrypt('real-api-key');
    expect(enc).toMatch(/^enc:v1:/);
    expect(secretBox.decrypt(enc)).toBe('real-api-key');
  });

  it('passes legacy plaintext rows through unchanged', () => {
    expect(secretBox.decrypt('josms_default_key')).toBe('josms_default_key');
  });
});
