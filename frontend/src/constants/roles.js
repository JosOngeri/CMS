/**
 * WHAT THIS FILE DOES
 * -------------------
 * This file lists every role a church user can have and provides friendly
 * labels and role groups used around the app.
 *
 * The backend stores these exact role names in the `roles` table, so the
 * strings here must match the backend values.
 *
 * FILES IT TALKS TO
 * -----------------
 * - Sidebar.jsx              → groups menu items by role
 * - dashboard.routes.jsx     → role-based route guards
 * - pages/dashboard/*.jsx    → dashboard dispatcher picks the right home
 * - usePermission.js         → can combine role checks with permissions
 */

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PASTOR: 'Pastor',
  FIRST_ELDER: 'First Elder',
  TREASURER: 'Treasurer',
  ELDER: 'Elder',
  DEACON: 'Deacon',
  DEACONESS: 'Deaconess',
  CHURCH_BOARD_MEMBER: 'Church Board Member',
  DEPARTMENT_HEAD: 'Department Head',
  ASSISTANT_DEPARTMENT_HEAD: 'Assistant Department Head',
  SUBCOMMITTEE_HEAD: 'Subcommittee Head',
  SUBCOMMITTEE_COLLECTOR: 'Subcommittee Collector',
  MEMBER: 'Member',
  CHILD: 'Child',
};

// Friendly labels shown in the UI (role badges, profile cards, etc.)
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'System Admin',
  [ROLES.ADMIN]: 'Church Admin',
  [ROLES.PASTOR]: 'Pastor',
  [ROLES.FIRST_ELDER]: 'First Elder',
  [ROLES.TREASURER]: 'Treasurer',
  [ROLES.ELDER]: 'Elder',
  [ROLES.DEACON]: 'Deacon',
  [ROLES.DEACONESS]: 'Deaconess',
  [ROLES.CHURCH_BOARD_MEMBER]: 'Board Member',
  [ROLES.DEPARTMENT_HEAD]: 'Department Head',
  [ROLES.ASSISTANT_DEPARTMENT_HEAD]: 'Assistant Department Head',
  [ROLES.SUBCOMMITTEE_HEAD]: 'Subcommittee Head',
  [ROLES.SUBCOMMITTEE_COLLECTOR]: 'Subcommittee Collector',
  [ROLES.MEMBER]: 'Member',
  [ROLES.CHILD]: 'Child',
};

// Role groupings used for route guards and sidebar visibility.
// A role in a higher group can generally see lower-group items.
export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.PASTOR,
  ROLES.FIRST_ELDER,
];

export const FINANCE_ROLES = [
  ...ADMIN_ROLES,
  ROLES.TREASURER,
];

export const LEADERSHIP_ROLES = [
  ...FINANCE_ROLES,
  ROLES.ELDER,
  ROLES.DEACON,
  ROLES.DEACONESS,
  ROLES.CHURCH_BOARD_MEMBER,
  ROLES.DEPARTMENT_HEAD,
  ROLES.ASSISTANT_DEPARTMENT_HEAD,
  ROLES.SUBCOMMITTEE_HEAD,
];

export const DEPARTMENT_MANAGEMENT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.PASTOR,
  ROLES.FIRST_ELDER,
  ROLES.DEPARTMENT_HEAD,
  ROLES.ASSISTANT_DEPARTMENT_HEAD,
];

export const MEMBER_SAFE_ROLES = [
  ROLES.MEMBER,
  ROLES.CHILD,
];

// Tailwind colour classes for role badges. Each entry has a light-mode
// variant; dark-mode overrides are applied by the same classes where needed.
export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  [ROLES.ADMIN]: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  [ROLES.PASTOR]: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  [ROLES.FIRST_ELDER]: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  [ROLES.TREASURER]: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  [ROLES.ELDER]: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  [ROLES.DEACON]: 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)]',
  [ROLES.DEACONESS]: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  [ROLES.CHURCH_BOARD_MEMBER]: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  [ROLES.DEPARTMENT_HEAD]: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  [ROLES.ASSISTANT_DEPARTMENT_HEAD]: 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)]',
  [ROLES.SUBCOMMITTEE_HEAD]: 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)]',
  [ROLES.SUBCOMMITTEE_COLLECTOR]: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  [ROLES.MEMBER]: 'bg-[var(--color-background)] text-[var(--color-text)]',
  [ROLES.CHILD]: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
};

// Helpers: prefer these over inline `roles.includes(...)` checks.
export const hasAdminRole = (roles) => roles?.some(r => ADMIN_ROLES.includes(r));
export const hasFinanceRole = (roles) => roles?.some(r => FINANCE_ROLES.includes(r));
export const hasLeadershipRole = (roles) => roles?.some(r => LEADERSHIP_ROLES.includes(r));
export const hasDepartmentManagementRole = (roles) => roles?.some(r => DEPARTMENT_MANAGEMENT_ROLES.includes(r));
export const isMemberLevel = (roles) => roles?.some(r => MEMBER_SAFE_ROLES.includes(r));
