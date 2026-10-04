/**
 * @audit Shared approver resolution for approval requests.
 * @purpose Every approval request must name whose approval is needed. These
 *          helpers resolve an explicit approver_id or an approver role name to
 *          a concrete active user inside the requester's church, so module
 *          routes, the generic POST /approvals, and escalation all resolve
 *          targets identically and never cross tenants.
 * @exports listApprovers, resolveApprover, APPROVER_ROLE_NAMES
 */
const db = require('../config/database');
const pool = db.pool || db;

// Roles that may act on approval requests — mirrors APPROVER_ROLES in
// approvals.routes.js / the approvals.approve grants in migration 038.
const APPROVER_ROLE_NAMES = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Department Head'];

const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * Users in this church who can legitimately approve requests — for the
 * "whose approval is needed" picker. Checks both role storage styles
 * (users.role and user_roles) and excludes the requester.
 */
async function listApprovers(churchId, excludeUserId = null) {
  // users.role exists on some databases and not others — to_jsonb reads it
  // when present and yields NULL when absent, so both schemas take one path.
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            to_jsonb(u)->>'role' AS legacy_role,
            (SELECT array_agg(r.name ORDER BY r.name) FROM user_roles ur
              JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id) AS extra_roles
     FROM users u
     WHERE u.church_id = $1 AND u.is_active = true
       AND ($2::uuid IS NULL OR u.id <> $2)
       AND ((to_jsonb(u)->>'role') = ANY($3) OR EXISTS (
         SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.id AND r.name = ANY($3)))
     ORDER BY u.first_name, u.last_name`,
    [churchId, excludeUserId, APPROVER_ROLE_NAMES]
  );
  return result.rows.map(u => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
    email: u.email,
    roles: u.extra_roles && u.extra_roles.length ? u.extra_roles : (u.legacy_role ? [u.legacy_role] : []),
    approver_roles: (u.extra_roles || (u.legacy_role ? [u.legacy_role] : [])).filter(r => APPROVER_ROLE_NAMES.includes(r)),
  }));
}

async function userCanApprove(userId, churchId) {
  const result = await pool.query(
    `SELECT 1 FROM users u
     WHERE u.id = $1 AND u.church_id = $2 AND u.is_active = true
       AND ((to_jsonb(u)->>'role') = ANY($3) OR EXISTS (
         SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.id AND r.name = ANY($3)))`,
    [userId, churchId, APPROVER_ROLE_NAMES]
  );
  return result.rows.length > 0;
}

async function resolveRoleToUser(churchId, roleName, excludeUserId = null) {
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name
     FROM users u
     WHERE u.church_id = $1 AND u.is_active = true
       AND ($3::uuid IS NULL OR u.id <> $3)
       AND ((to_jsonb(u)->>'role') = $2 OR EXISTS (
         SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.id AND r.name = $2))
     ORDER BY u.created_at LIMIT 1`,
    [churchId, roleName, excludeUserId]
  );
  return result.rows[0] || null;
}

/**
 * Resolve whose approval a request needs.
 *  - approverId: must be an active approver-role holder in this church.
 *  - approverRole / fallbackRole: resolved to the first active holder in
 *    this church; church settings.approvals.escalate_role overrides the
 *    fallback default.
 * Throws a statusCode-carrying error the controllers map to 400/404.
 */
async function resolveApprover(churchId, { approverId = null, approverRole = null, fallbackRole = 'First Elder', excludeUserId = null } = {}) {
  if (approverId) {
    if (approverId === excludeUserId) {
      throw fail('You cannot assign yourself as the approver');
    }
    if (!(await userCanApprove(approverId, churchId))) {
      throw fail('Selected approver is not a valid approver in this church', 404);
    }
    const u = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1', [approverId]
    );
    return u.rows[0];
  }
  let role = approverRole;
  if (!role) {
    const s = await pool.query(
      "SELECT settings->'approvals'->>'escalate_role' AS role FROM churches WHERE id = $1",
      [churchId]
    );
    role = s.rows[0]?.role || fallbackRole;
  }
  const target = await resolveRoleToUser(churchId, role, excludeUserId);
  if (!target) {
    throw fail(`No active "${role}" found in this church`, 404);
  }
  return target;
}

module.exports = { listApprovers, resolveApprover, APPROVER_ROLE_NAMES };
