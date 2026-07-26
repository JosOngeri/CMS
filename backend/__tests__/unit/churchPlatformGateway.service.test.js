jest.mock('../../repositories/ChurchRepository', () => ({
  getChurchBySlugForCheck: jest.fn(),
  createChurch: jest.fn(),
  getChurchById: jest.fn(),
  checkSlugExists: jest.fn(),
  updateChurch: jest.fn()
}));

const ChurchRepository = require('../../repositories/ChurchRepository');
const { createTenant, updateTenant } = require('../../services/churchPlatformGateway.service');

describe('church platform gateway', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant with validated platform subscription settings', async () => {
    ChurchRepository.getChurchBySlugForCheck.mockResolvedValue(null);
    ChurchRepository.createChurch.mockResolvedValue({
      id: 'tenant-id', name: 'Hope Church', slug: 'hope-church', is_active: true,
      settings: { subscription_tier: 'professional', billing_cycle: 'annual' }
    });

    const tenant = await createTenant({
      name: ' Hope Church ', slug: 'hope-church', subscriptionTier: 'professional', billingCycle: 'annual', contactEmail: 'contact@example.com'
    });

    expect(ChurchRepository.createChurch).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hope Church', slug: 'hope-church' }));
    expect(tenant.subscription_tier).toBe('professional');
  });

  it('rejects unsupported subscription tiers', async () => {
    await expect(createTenant({ name: 'Hope Church', slug: 'hope-church', subscriptionTier: 'unlimited' }))
      .rejects.toThrow('Invalid subscription tier');
  });

  it('preserves tenant settings when updating a subscription', async () => {
    ChurchRepository.getChurchById.mockResolvedValue({
      id: 'tenant-id', name: 'Hope Church', slug: 'hope-church', settings: { timezone: 'Africa/Nairobi', subscription_tier: 'basic', billing_cycle: 'monthly' }
    });
    ChurchRepository.checkSlugExists.mockResolvedValue(null);
    ChurchRepository.updateChurch.mockResolvedValue({
      id: 'tenant-id', name: 'Hope Church', slug: 'hope-church', is_active: true,
      settings: { timezone: 'Africa/Nairobi', subscription_tier: 'enterprise', billing_cycle: 'annual' }
    });

    const tenant = await updateTenant('tenant-id', { subscriptionTier: 'enterprise', billingCycle: 'annual' });

    expect(tenant.subscription_tier).toBe('enterprise');
    expect(ChurchRepository.updateChurch).toHaveBeenCalledWith('tenant-id', expect.any(Array), expect.arrayContaining([expect.stringContaining('timezone')]));
  });
});
