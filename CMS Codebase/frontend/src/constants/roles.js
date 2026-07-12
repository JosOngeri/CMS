/**
 * Role constants
 */

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  PASTOR: 'Pastor',
  FIRST_ELDER: 'First Elder',
  DEPARTMENT_HEAD: 'Department Head',
  MEMBER: 'Member',
}

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.PASTOR, ROLES.FIRST_ELDER]

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'bg-red-100 text-red-800 bg-red-900/20 text-red-200',
  [ROLES.PASTOR]: 'bg-purple-100 text-purple-800 bg-purple-900/20 text-purple-200',
  [ROLES.FIRST_ELDER]: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800 bg-[var(--color-primary)]-900/20 text-[var(--color-primary)]-200',
  [ROLES.DEPARTMENT_HEAD]: 'bg-green-100 text-green-800 bg-green-900/20 text-green-200',
  [ROLES.MEMBER]: 'bg-[var(--color-surface)] text-[var(--color-text)]',
}

export const hasAdminRole = (roles) => {
  return roles?.some(role => ADMIN_ROLES.includes(role))
}
