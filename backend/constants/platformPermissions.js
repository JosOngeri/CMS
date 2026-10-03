/**
 * Platform permission catalog — the single source of truth for what a
 * platform (SaaS) user may do. Church roles/permissions live elsewhere;
 * this file is only for the /api/platform/* control plane.
 *
 * Convention: `<area>:<action>` — `read` for viewing, `manage` for
 * mutating. `tenant:administer`/`tenant:impersonate` are deliberately
 * separate from `tenant:manage` (lifecycle CRUD) because they reach
 * INTO a church's data — the highest-risk capability on the platform.
 *
 * Used by:
 * - middleware/platformAuth.js   → requirePlatformPermission / normalizePermissions
 * - controllers/platform.controller.js → seeds permissions on user create
 * - migrations/077_platform_permission_catalog.sql → backfills stored rows
 * - (later) PlatformUsers UI     → role → permission preview
 */

// Grouped catalog — order is display order for the staff UI.
const PLATFORM_PERMISSION_GROUPS = {
  platform: ['platform:read'],
  tenants: ['tenant:read', 'tenant:manage', 'tenant:administer', 'tenant:impersonate'],
  staff: ['staff:read', 'staff:manage'],
  monitoring: ['metrics:read', 'health:read', 'monitoring:manage'],
  payments: ['payments:read', 'payments:manage'],
  security: ['security:read', 'security:manage'],
  audit: ['audit:read', 'audit:export'],
  data: ['data:read', 'data:export', 'data:manage'],
  incidents: ['incidents:read', 'incidents:manage'],
  billing: ['billing:read', 'billing:manage'],
  communication: ['communication:manage'],
  support: ['support:read', 'support:manage'],
  flags: ['flags:manage'],
  settings: ['settings:read', 'settings:manage'],
};

const PLATFORM_PERMISSIONS = Object.values(PLATFORM_PERMISSION_GROUPS).flat();

// Role → default permissions. platform_owner is wildcard '*' by design;
// everyone else gets an explicit least-privilege list.
const ROLE_PERMISSIONS = {
  platform_owner: ['*'],
  platform_admin: [
    'platform:read',
    'tenant:read', 'tenant:manage', 'tenant:administer',
    'staff:read',
    'metrics:read', 'health:read', 'monitoring:manage',
    'payments:read', 'payments:manage',
    'security:read',
    'audit:read',
    'data:read', 'data:manage',
    'incidents:read',
    'billing:read', 'billing:manage',
    'communication:manage',
    'support:read', 'support:manage',
    'flags:manage',
    'settings:read', 'settings:manage',
  ],
  support_staff: [
    'platform:read',
    'tenant:read',
    'metrics:read', 'health:read',
    'support:read',
  ],
  // legacy alias of support_staff — kept until rows are migrated
  support: [
    'platform:read',
    'tenant:read',
    'metrics:read', 'health:read',
    'support:read',
  ],
};

// Permissions reserved for platform_owner only — never grant these to
// other roles even if asked; they must stay behind the wildcard.
const OWNER_ONLY_PERMISSIONS = [
  'staff:manage',
  'tenant:impersonate',
  'security:manage',
  'data:export',
  'incidents:manage',
];

module.exports = {
  PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  OWNER_ONLY_PERMISSIONS,
};
