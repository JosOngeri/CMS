const { requirePlatformPermission, normalizePermissions } = require('../../middleware/platformAuth');

describe('platform authorization middleware', () => {
  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  });

  it('grants platform owners wildcard access', () => {
    const next = jest.fn();
    const middleware = requirePlatformPermission('tenant:manage');

    middleware({ platformUser: { permissions: ['*'] } }, createResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects support users from tenant management', () => {
    const next = jest.fn();
    const res = createResponse();
    const middleware = requirePlatformPermission('tenant:manage');

    middleware({ platformUser: { permissions: ['tenant:read'] } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('uses the default support permissions when no explicit permissions exist', () => {
    expect(normalizePermissions(null, 'support')).toEqual(['platform:read', 'tenant:read']);
  });
});
