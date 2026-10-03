/**
 * Platform-admin regression tests.
 * Pins the fixes made for the superadmin dashboard:
 *  - legacy 'all' permission must normalize to the '*' wildcard (seeded owner
 *    was 403'd from every endpoint)
 *  - requirePlatformPermission honours '*' and exact matches
 *  - createTenant returns the generated temp password exactly once and never
 *    echoes back an operator-supplied password
 *  - 'free' is a valid subscription tier (present in live data)
 */

jest.mock('../../repositories/ChurchRepository', () => ({
  getChurchBySlugForCheck: jest.fn(),
  createChurch: jest.fn(),
  createChurchWithAdmin: jest.fn(),
}));
jest.mock('../../repositories/UserRepository', () => ({
  findByEmail: jest.fn(),
}));

const ChurchRepository = require('../../repositories/ChurchRepository');
const UserRepository = require('../../repositories/UserRepository');
const {
  normalizePermissions,
  requirePlatformPermission,
  requirePlatformRole,
} = require('../../middleware/platformAuth');
const gateway = require('../../services/churchPlatformGateway.service');

describe('normalizePermissions (wildcard fix)', () => {
  it('maps legacy "all" array entry to "*"', () => {
    expect(normalizePermissions(['all'], 'platform_owner')).toEqual(['*']);
  });

  it('maps legacy "all" inside a JSON string', () => {
    expect(normalizePermissions('["all"]', 'platform_owner')).toEqual(['*']);
  });

  it('passes through explicit permissions untouched', () => {
    expect(normalizePermissions(['tenant:read'], 'support_staff')).toEqual(['tenant:read']);
  });

  it('falls back to role defaults when permissions are missing', () => {
    expect(normalizePermissions(null, 'platform_owner')).toEqual(['*']);
    expect(normalizePermissions(undefined, 'support_staff')).toEqual(['platform:read', 'tenant:read']);
  });

  it('treats the legacy "support" role as support_staff', () => {
    expect(normalizePermissions(null, 'support')).toEqual(['platform:read', 'tenant:read']);
  });

  it('returns an empty list for unknown roles', () => {
    expect(normalizePermissions(null, 'bogus')).toEqual([]);
  });
});

describe('requirePlatformPermission', () => {
  const run = (middleware, platformUser) => {
    const req = { platformUser };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    return { res, next };
  };

  it('allows a wildcard user through any permission gate', () => {
    const { next } = run(requirePlatformPermission('settings:manage'), { permissions: ['*'] });
    expect(next).toHaveBeenCalled();
  });

  it('allows exact permission matches', () => {
    const { next } = run(requirePlatformPermission('tenant:read'), { permissions: ['tenant:read'] });
    expect(next).toHaveBeenCalled();
  });

  it('rejects missing permissions with 403', () => {
    const { res, next } = run(requirePlatformPermission('settings:manage'), { permissions: ['tenant:read'] });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects unauthenticated requests with 401', () => {
    const { res } = run(requirePlatformPermission('tenant:read'), undefined);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requirePlatformRole', () => {
  it('admits allowed roles and rejects others', () => {
    const middleware = requirePlatformRole(['platform_owner']);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware({ platformUser: { role: 'platform_owner' } }, res, next);
    expect(next).toHaveBeenCalled();

    middleware({ platformUser: { role: 'support_staff' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('churchPlatformGateway.createTenant', () => {
  const input = {
    name: 'Test Chapel',
    slug: 'test-chapel',
    subscriptionTier: 'basic',
    billingCycle: 'monthly',
    admin: { firstName: 'Jane', lastName: 'Doe', email: 'jane@testchapel.org' },
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns the generated temporary password exactly once', async () => {
    ChurchRepository.getChurchBySlugForCheck.mockResolvedValue(null);
    UserRepository.findByEmail.mockResolvedValue(null);
    ChurchRepository.createChurchWithAdmin.mockResolvedValue({
      church: { id: 'church-1', name: 'Test Chapel', slug: 'test-chapel', settings: {}, is_active: true },
      adminUser: { email: 'jane@testchapel.org' },
      roleAssigned: true,
    });

    const tenant = await gateway.createTenant(input);

    expect(ChurchRepository.createChurchWithAdmin).toHaveBeenCalled();
    const adminArg = ChurchRepository.createChurchWithAdmin.mock.calls[0][1];
    expect(adminArg.passwordHash).toMatch(/^\$2/); // bcrypt hash, never plaintext
    expect(adminArg.username).toBe('admin.test-chapel');
    expect(tenant.initialAdmin.temporaryPassword).toBeTruthy();
    expect(tenant.initialAdmin.roleAssigned).toBe(true);
  });

  it('does not echo back an operator-supplied password', async () => {
    ChurchRepository.getChurchBySlugForCheck.mockResolvedValue(null);
    UserRepository.findByEmail.mockResolvedValue(null);
    ChurchRepository.createChurchWithAdmin.mockResolvedValue({
      church: { id: 'church-2', name: 'Test Chapel', slug: 'test-chapel', settings: {}, is_active: true },
      adminUser: { email: 'jane@testchapel.org' },
      roleAssigned: true,
    });

    const tenant = await gateway.createTenant({ ...input, admin: { ...input.admin, password: 'SuppliedPass123' } });
    expect(tenant.initialAdmin.temporaryPassword).toBeNull();
  });

  it('rejects a duplicate admin email with ADMIN_EMAIL_TAKEN', async () => {
    ChurchRepository.getChurchBySlugForCheck.mockResolvedValue(null);
    UserRepository.findByEmail.mockResolvedValue({ id: 1 });

    await expect(gateway.createTenant(input)).rejects.toMatchObject({ code: 'ADMIN_EMAIL_TAKEN' });
    expect(ChurchRepository.createChurchWithAdmin).not.toHaveBeenCalled();
  });

  it('creates a church without an admin block (no credentials returned)', async () => {
    ChurchRepository.getChurchBySlugForCheck.mockResolvedValue(null);
    ChurchRepository.createChurch.mockResolvedValue({ id: 'church-3', name: 'Test Chapel', slug: 'test-chapel', settings: {}, is_active: true });

    const tenant = await gateway.createTenant({ name: 'Test Chapel', slug: 'test-chapel' });
    expect(tenant.initialAdmin).toBeUndefined();
    expect(ChurchRepository.createChurchWithAdmin).not.toHaveBeenCalled();
  });

  it('accepts the free subscription tier used by live churches', async () => {
    ChurchRepository.getChurchBySlugForCheck.mockResolvedValue(null);
    ChurchRepository.createChurch.mockResolvedValue({ id: 'church-4', name: 'Test Chapel', slug: 'test-chapel', settings: {}, is_active: true });

    await expect(gateway.createTenant({ name: 'Test Chapel', slug: 'test-chapel', subscriptionTier: 'free' })).resolves.toBeTruthy();
  });

  it('rejects invalid admin input before touching the database', async () => {
    await expect(gateway.createTenant({ ...input, admin: { firstName: 'Jane', lastName: '', email: 'bad' } }))
      .rejects.toThrow('Initial admin requires');
    expect(ChurchRepository.getChurchBySlugForCheck).not.toHaveBeenCalled();
  });
});
