const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const ChurchRepository = require('../repositories/ChurchRepository');
const ChurchService = require('./ChurchService');
const UserRepository = require('../repositories/UserRepository');

const ALLOWED_SUBSCRIPTION_TIERS = new Set(['free', 'basic', 'professional', 'enterprise']);
const ALLOWED_BILLING_CYCLES = new Set(['monthly', 'annual']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeTenantInput = ({ name, slug, subscriptionTier, billingCycle, contactName, contactEmail }) => {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  const normalizedTier = typeof subscriptionTier === 'string' ? subscriptionTier.toLowerCase() : 'basic';
  const normalizedCycle = typeof billingCycle === 'string' ? billingCycle.toLowerCase() : 'monthly';

  if (!normalizedName || normalizedName.length > 255) {
    throw new Error('Church name is required and must be at most 255 characters');
  }
  if (!ChurchService.isValidSlug(normalizedSlug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }
  if (!ALLOWED_SUBSCRIPTION_TIERS.has(normalizedTier)) {
    throw new Error('Invalid subscription tier');
  }
  if (!ALLOWED_BILLING_CYCLES.has(normalizedCycle)) {
    throw new Error('Invalid billing cycle');
  }
  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    throw new Error('Contact email is invalid');
  }

  return {
    name: normalizedName,
    slug: normalizedSlug,
    settings: {
      subscription_tier: normalizedTier,
      billing_cycle: normalizedCycle,
      contact_name: typeof contactName === 'string' ? contactName.trim() : '',
      contact_email: typeof contactEmail === 'string' ? contactEmail.trim().toLowerCase() : ''
    }
  };
};

const serializeTenant = (church) => ({
  id: church.id,
  name: church.name,
  slug: church.slug,
  status: church.is_active === false ? 'suspended' : 'active',
  // settings JSON wins; the dedicated columns are a legacy fallback
  subscription_tier: church.settings?.subscription_tier || church.subscription_tier || 'basic',
  billing_cycle: church.settings?.billing_cycle || church.billing_cycle || 'monthly',
  contact_name: church.settings?.contact_name || '',
  contact_email: church.settings?.contact_email || '',
  user_count: Number(church.user_count || 0),
  member_count: Number(church.member_count || 0),
  created_at: church.created_at,
  updated_at: church.updated_at
});

// Optional initial church admin, provisioned in the same transaction as the
// church so a tenant is never created without a login path into it.
const normalizeAdminInput = (admin) => {
  if (!admin) return null;

  const firstName = typeof admin.firstName === 'string' ? admin.firstName.trim() : '';
  const lastName = typeof admin.lastName === 'string' ? admin.lastName.trim() : '';
  const email = typeof admin.email === 'string' ? admin.email.trim().toLowerCase() : '';
  const password = typeof admin.password === 'string' && admin.password.length >= 8 ? admin.password : null;

  if (!firstName || !lastName || !EMAIL_PATTERN.test(email)) {
    throw new Error('Initial admin requires firstName, lastName, and a valid email');
  }

  return {
    firstName,
    lastName,
    email,
    // A temp password is generated when the caller doesn't supply one; it is
    // returned exactly once in the create response, never stored plaintext.
    password: password || crypto.randomBytes(9).toString('base64url'),
    generatedPassword: !password
  };
};

const getTenantSummaries = async (filters) => {
  const { churches, total } = await ChurchRepository.getPlatformChurches(filters);
  return { tenants: churches.map(serializeTenant), total };
};

const getTenant = async (tenantId) => {
  const church = await ChurchRepository.getChurchById(tenantId);

  if (!church) {
    return null;
  }

  return serializeTenant(church);
};

const createTenant = async (input) => {
  const tenant = normalizeTenantInput(input);
  const admin = normalizeAdminInput(input.admin);
  const existingTenant = await ChurchRepository.getChurchBySlugForCheck(tenant.slug);
  if (existingTenant) {
    throw new Error('Church slug already exists');
  }

  if (!admin) {
    return serializeTenant(await ChurchRepository.createChurch(tenant));
  }

  if (await UserRepository.findByEmail(admin.email)) {
    const err = new Error('Admin email already registered');
    err.code = 'ADMIN_EMAIL_TAKEN';
    throw err;
  }

  const passwordHash = await bcrypt.hash(admin.password, 10);
  // username must be globally unique — derive from the church slug
  const adminUsername = `admin.${tenant.slug}`;
  const { church, adminUser, roleAssigned } = await ChurchRepository.createChurchWithAdmin(tenant, {
    ...admin,
    passwordHash,
    username: adminUsername,
    slug: `admin-${tenant.slug}-${crypto.randomBytes(3).toString('hex')}`
  });

  return {
    ...serializeTenant(church),
    initialAdmin: {
      email: adminUser.email,
      username: adminUsername,
      roleAssigned,
      temporaryPassword: admin.generatedPassword ? admin.password : null
    }
  };
};

const updateTenant = async (tenantId, input) => {
  const existingTenant = await ChurchRepository.getChurchById(tenantId);
  if (!existingTenant) {
    return null;
  }

  const tenant = normalizeTenantInput({
    name: input.name ?? existingTenant.name,
    slug: input.slug ?? existingTenant.slug,
    subscriptionTier: input.subscriptionTier ?? existingTenant.settings?.subscription_tier ?? 'basic',
    billingCycle: input.billingCycle ?? existingTenant.settings?.billing_cycle ?? 'monthly',
    contactName: input.contactName ?? existingTenant.settings?.contact_name ?? '',
    contactEmail: input.contactEmail ?? existingTenant.settings?.contact_email ?? ''
  });

  const slugConflict = await ChurchRepository.checkSlugExists(tenant.slug, tenantId);
  if (slugConflict) {
    throw new Error('Church slug already exists');
  }

  const settings = { ...(existingTenant.settings || {}), ...tenant.settings };
  const updatedTenant = await ChurchRepository.updateChurch(tenantId, ['name = $1', 'slug = $2', 'settings = $3'], [tenant.name, tenant.slug, JSON.stringify(settings)]);
  return serializeTenant(updatedTenant);
};

const archiveTenant = async (tenantId) => ChurchRepository.archiveChurch(tenantId);

const getTenantMetrics = async (tenantId) => ChurchRepository.getTenantMetrics(tenantId);

const getTenantActivity = async (tenantId, limit) => ChurchRepository.getTenantActivity(tenantId, limit);

const setTenantStatus = async (tenantId, isActive) => {
  return ChurchRepository.updateChurch(tenantId, ['is_active = $1'], [isActive]);
};

module.exports = {
  getTenantSummaries,
  getTenant,
  createTenant,
  updateTenant,
  archiveTenant,
  getTenantMetrics,
  getTenantActivity,
  setTenantStatus
};
